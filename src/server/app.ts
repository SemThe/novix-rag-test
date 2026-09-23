import express, { type ErrorRequestHandler } from "express";
import multer from "multer";
import { ingestAll } from "../ingest.js";
import { createSource, deleteSource, listSources, ValidationError } from "../sources.js";
import { extractText } from "./extractText.js";
import { generateContent } from "../generate.js";
import { listAll, listPending, getOne, approve, reject, updateContent } from "../review.js";
import type { GeneratedContent, OpdrachtType } from "../types.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".txt", ".md", ".pdf"];
    const ok = allowed.some((ext) => file.originalname.toLowerCase().endsWith(ext));
    if (!ok) {
      cb(new Error("Alleen .txt, .md en .pdf bestanden worden ondersteund."));
      return;
    }
    cb(null, true);
  },
});

class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function asyncRoute(fn: (req: express.Request, res: express.Response) => Promise<void>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    fn(req, res).catch(next);
  };
}

export function createApp() {
  const app = express();
  app.use(express.json());

  // --- Bronnen ---

  app.get(
    "/api/sources",
    asyncRoute(async (_req, res) => {
      res.json(await listSources());
    })
  );

  app.post(
    "/api/sources",
    upload.single("file"),
    asyncRoute(async (req, res) => {
      const file = req.file;
      if (!file) throw new HttpError(400, "Geen bestand meegestuurd (veld 'file').");

      const text = await extractText(file.buffer, file.originalname, file.mimetype);
      const body = req.body as Record<string, string>;

      const summary = await createSource({
        title: body.title || file.originalname.replace(/\.[^.]+$/, ""),
        type: body.type,
        publicationDate: body.publicationDate,
        trustLevel: body.trustLevel,
        licenseStatus: body.licenseStatus,
        expiresAt: body.expiresAt || undefined,
        content: text,
      });
      res.status(201).json(summary);
    })
  );

  app.delete(
    "/api/sources/:id",
    asyncRoute(async (req, res) => {
      await deleteSource(String(req.params.id));
      res.status(204).end();
    })
  );

  app.post(
    "/api/ingest",
    asyncRoute(async (_req, res) => {
      res.json(await ingestAll());
    })
  );

  // --- Generatie ---

  app.post(
    "/api/generate",
    asyncRoute(async (req, res) => {
      const body = req.body as {
        opdrachtType: OpdrachtType;
        prompt: string;
        instructions?: string;
        sourceType?: string;
        since?: string;
        topK?: number;
        minScore?: number;
        provider?: string;
      };

      if (!body.prompt?.trim()) throw new HttpError(400, "Veld 'prompt' is verplicht.");
      if (!["digest-artifact", "trivia", "quiz"].includes(body.opdrachtType)) {
        throw new HttpError(400, "Ongeldig opdrachtType.");
      }

      const item = await generateContent(body.opdrachtType, body.prompt.trim(), {
        instructions: body.instructions?.trim() || undefined,
        sourceType: body.sourceType || undefined,
        sinceDate: body.since || undefined,
        topK: body.topK,
        minScore: body.minScore,
        provider: body.provider,
      });
      res.status(201).json(item);
    })
  );

  // --- Reviewwachtrij ---

  app.get(
    "/api/generated",
    asyncRoute(async (req, res) => {
      const status = req.query.status;
      res.json(status === "pending_review" ? await listPending() : await listAll());
    })
  );

  app.get(
    "/api/generated/:id",
    asyncRoute(async (req, res) => {
      res.json(await getOne(String(req.params.id)));
    })
  );

  app.patch(
    "/api/generated/:id/content",
    asyncRoute(async (req, res) => {
      const content = req.body as GeneratedContent;
      res.json(await updateContent(String(req.params.id), content));
    })
  );

  app.post(
    "/api/generated/:id/approve",
    asyncRoute(async (req, res) => {
      const edited = Boolean((req.body as { edited?: boolean })?.edited);
      res.json(await approve(String(req.params.id), edited));
    })
  );

  app.post(
    "/api/generated/:id/reject",
    asyncRoute(async (req, res) => {
      const reason = (req.body as { reason?: string })?.reason;
      if (!reason?.trim()) throw new HttpError(400, "Veld 'reason' is verplicht.");
      res.json(await reject(String(req.params.id), reason.trim()));
    })
  );

  // --- Statistieken ---

  app.get(
    "/api/stats",
    asyncRoute(async (_req, res) => {
      const items = await listAll();
      const total = items.length;
      const counts = { pending_review: 0, approved: 0, approved_edited: 0, rejected: 0 } as Record<string, number>;
      for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;
      const reviewed = counts.approved + counts.approved_edited + counts.rejected;
      const cleanApprovalRate = reviewed > 0 ? counts.approved / reviewed : null;
      res.json({ total, counts, cleanApprovalRate });
    })
  );

  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof multer.MulterError || (err instanceof Error && err.message.includes("bestanden worden ondersteund"))) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    const message = err instanceof Error ? err.message : "Onbekende serverfout.";
    // Generatie-weigeringen (geen grondslag, gehallucineerde citaties) zijn verwacht gedrag,
    // geen serverfout — stuur ze als 422 zodat de UI ze als weigering kan tonen.
    const status = message.includes("Generatie geweigerd") ? 422 : 500;
    res.status(status).json({ error: message });
  };
  app.use(errorHandler);

  return app;
}
