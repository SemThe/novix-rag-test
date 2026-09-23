import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { SOURCES_DIR } from "./config.js";
import { ingestAll } from "./ingest.js";
import { VectorStore } from "./vectorstore.js";
import type { LicenseStatus, SourceMetadata, SourceSummary, SourceType } from "./types.js";

const SOURCE_TYPES: SourceType[] = ["nieuwsartikel", "overheidspublicatie", "encyclopedisch", "redactionele-notitie"];
const TRUST_LEVELS = ["hoog", "middel", "laag"] as const;
const LICENSE_STATUSES: LicenseStatus[] = ["vrij-te-gebruiken-als-input", "parafraseren-toegestaan", "niet-toegestaan"];

export class ValidationError extends Error {}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "bron"
  );
}

export interface NewSourceInput {
  title: string;
  type: string;
  publicationDate: string;
  trustLevel: string;
  licenseStatus: string;
  expiresAt?: string;
  content: string;
}

function validateNewSource(input: NewSourceInput): void {
  if (!input.title?.trim()) throw new ValidationError("Titel is verplicht.");
  if (!SOURCE_TYPES.includes(input.type as SourceType)) {
    throw new ValidationError(`Ongeldig brontype "${input.type}". Kies uit: ${SOURCE_TYPES.join(", ")}.`);
  }
  if (!TRUST_LEVELS.includes(input.trustLevel as (typeof TRUST_LEVELS)[number])) {
    throw new ValidationError(`Ongeldig betrouwbaarheidsniveau "${input.trustLevel}". Kies uit: ${TRUST_LEVELS.join(", ")}.`);
  }
  if (!LICENSE_STATUSES.includes(input.licenseStatus as LicenseStatus)) {
    throw new ValidationError(`Ongeldige licentiestatus "${input.licenseStatus}". Kies uit: ${LICENSE_STATUSES.join(", ")}.`);
  }
  if (!input.publicationDate || Number.isNaN(new Date(input.publicationDate).getTime())) {
    throw new ValidationError("Publicatiedatum is verplicht en moet een geldige datum zijn.");
  }
  if (input.expiresAt && Number.isNaN(new Date(input.expiresAt).getTime())) {
    throw new ValidationError("Vervaldatum is geen geldige datum.");
  }
  if (!input.content?.trim()) {
    throw new ValidationError("Brontekst is leeg — kon er geen tekst uit het bestand gehaald worden?");
  }
}

async function uniqueSourceId(baseSlug: string): Promise<string> {
  await fs.mkdir(SOURCES_DIR, { recursive: true });
  const existing = new Set((await fs.readdir(SOURCES_DIR)).map((f) => path.basename(f, ".md")));
  if (!existing.has(baseSlug)) return baseSlug;
  let i = 2;
  while (existing.has(`${baseSlug}-${i}`)) i++;
  return `${baseSlug}-${i}`;
}

export async function listSources(): Promise<SourceSummary[]> {
  await fs.mkdir(SOURCES_DIR, { recursive: true });
  const files = (await fs.readdir(SOURCES_DIR)).filter((f) => f.endsWith(".md"));

  const store = new VectorStore();
  await store.load();
  const chunkCounts = store.countBySource();

  const now = new Date();
  const sources: SourceSummary[] = [];
  for (const file of files) {
    const id = path.basename(file, ".md");
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    const { data } = matter(raw);
    const meta = data as Omit<SourceMetadata, "id">;
    sources.push({
      id,
      ...meta,
      status: meta.expiresAt && new Date(meta.expiresAt) < now ? "verlopen" : "actief",
      chunkCount: chunkCounts.get(id) ?? 0,
    });
  }
  return sources.sort((a, b) => b.publicationDate.localeCompare(a.publicationDate));
}

export async function createSource(input: NewSourceInput): Promise<SourceSummary> {
  validateNewSource(input);
  const id = await uniqueSourceId(slugify(input.title));

  const frontmatter: Record<string, string> = {
    title: input.title.trim(),
    type: input.type,
    publicationDate: input.publicationDate,
    trustLevel: input.trustLevel,
    licenseStatus: input.licenseStatus,
  };
  if (input.expiresAt) frontmatter.expiresAt = input.expiresAt;

  const fileContent = matter.stringify(input.content.trim() + "\n", frontmatter);
  await fs.mkdir(SOURCES_DIR, { recursive: true });
  await fs.writeFile(path.join(SOURCES_DIR, `${id}.md`), fileContent, "utf-8");

  await ingestAll();

  const [summary] = (await listSources()).filter((s) => s.id === id);
  return summary;
}

export async function deleteSource(id: string): Promise<void> {
  const filePath = path.join(SOURCES_DIR, `${id}.md`);
  await fs.rm(filePath, { force: true });

  const store = new VectorStore();
  await store.load();
  store.replaceSourceChunks(id, []);
  await store.save();
}
