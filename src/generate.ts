import Anthropic from "@anthropic-ai/sdk";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ANTHROPIC_API_KEY, CLAUDE_MODEL, GENERATED_DIR, PROMPT_VERSION } from "./config.js";
import { retrieve } from "./retrieve.js";
import type { GeneratedItem, RetrievedChunk } from "./types.js";

const SUBMIT_TOOL = {
  name: "submit_digest_artifact",
  description:
    "Lever een digest-artifact aan: een kort uitlegstuk met een 'in één zin'-samenvatting, uitsluitend gebaseerd op de meegegeven brondocumenten.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "Korte titel voor het artifact." },
      oneSentenceSummary: { type: "string", description: "De kern van het artifact in één zin." },
      body: { type: "string", description: "Het uitlegstuk, 100-200 woorden, uitsluitend gebaseerd op de bronfragmenten." },
      citations: {
        type: "array",
        description: "De chunk-id's (exact zoals gegeven, bv. 'bron-1#0') die daadwerkelijk gebruikt zijn.",
        items: { type: "string" },
      },
    },
    required: ["title", "oneSentenceSummary", "body", "citations"],
  },
};

function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c) =>
        `[${c.id}] Bron: "${c.sourceTitle}" (${c.sourceType}, gepubliceerd ${c.publicationDate}, betrouwbaarheid: ${c.trustLevel})\n${c.text}`
    )
    .join("\n\n---\n\n");
}

export async function generateDigestArtifact(
  topic: string,
  opts: { topK?: number; sourceType?: string; sinceDate?: string } = {}
): Promise<GeneratedItem> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY ontbreekt. Zet 'm in .env (zie .env.example).");
  }

  const chunks = await retrieve(topic, opts);
  if (chunks.length === 0) {
    throw new Error(
      `Geen (niet-verlopen) brongrondslag gevonden voor "${topic}". Generatie geweigerd — het systeem genereert nooit zonder retrieval-context (blueprint advies 6.1).`
    );
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1024,
    system:
      "Je bent de content-generatielaag van de Novix backoffice. Je maakt een 'digest-artifact' " +
      "uitsluitend op basis van de meegegeven brondocumenten. Verzin nooit feiten die niet in de " +
      "fragmenten staan. Als de fragmenten een vraag niet beantwoorden, zeg dat expliciet in de body " +
      "in plaats van te gokken. Schrijf in het Nederlands. Roep altijd de tool submit_digest_artifact " +
      "aan, en vermeld in 'citations' alleen chunk-id's die je daadwerkelijk gebruikt hebt.",
    tools: [SUBMIT_TOOL],
    tool_choice: { type: "tool", name: "submit_digest_artifact" },
    messages: [
      {
        role: "user",
        content: `Onderwerp/opdracht: "${topic}"\n\nBeschikbare brondocumenten:\n\n${buildContext(chunks)}`,
      },
    ],
  });

  const toolUse = message.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude heeft geen submit_digest_artifact tool call teruggegeven.");
  }

  const input = toolUse.input as { title: string; oneSentenceSummary: string; body: string; citations: string[] };
  const retrievedIds = new Set(chunks.map((c) => c.id));
  const validCitationIds = (input.citations ?? []).filter((id) => retrievedIds.has(id));

  if (validCitationIds.length === 0) {
    throw new Error(
      "Generatie geweigerd: het model gaf geen citaties die terug te herleiden zijn naar de opgehaalde fragmenten " +
        "(mogelijk gehallucineerd). Geen output zonder verifieerbare bronvermelding."
    );
  }

  const citations = validCitationIds.map((chunkId) => {
    const chunk = chunks.find((c) => c.id === chunkId)!;
    return { chunkId, sourceId: chunk.sourceId, sourceTitle: chunk.sourceTitle };
  });

  const item: GeneratedItem = {
    id: randomUUID(),
    opdrachtType: "digest-artifact",
    topic,
    promptVersion: PROMPT_VERSION,
    model: CLAUDE_MODEL,
    generatedAt: new Date().toISOString(),
    retrievedChunkIds: chunks.map((c) => c.id),
    citations,
    title: input.title,
    oneSentenceSummary: input.oneSentenceSummary,
    body: input.body,
    status: "pending_review",
  };

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(path.join(GENERATED_DIR, `${item.id}.json`), JSON.stringify(item, null, 2), "utf-8");

  return item;
}
