import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CLAUDE_MODEL, GENERATED_DIR, OLLAMA_MODEL, PROMPT_VERSION } from "./config.js";
import { retrieve } from "./retrieve.js";
import { getProvider } from "./llm/index.js";
import type { GeneratedItem } from "./types.js";

export async function generateDigestArtifact(
  topic: string,
  opts: { topK?: number; sourceType?: string; sinceDate?: string; provider?: string } = {}
): Promise<GeneratedItem> {
  const chunks = await retrieve(topic, opts);
  if (chunks.length === 0) {
    throw new Error(
      `Geen (niet-verlopen) brongrondslag gevonden voor "${topic}". Generatie geweigerd — het systeem genereert nooit zonder retrieval-context (blueprint advies 6.1).`
    );
  }

  const provider = getProvider(opts.provider);
  const result = await provider.generateDigestArtifact(topic, chunks);

  const retrievedIds = new Set(chunks.map((c) => c.id));
  const validCitationIds = (result.citations ?? []).filter((id) => retrievedIds.has(id));

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
    model: `${provider.name}:${provider.name === "ollama" ? OLLAMA_MODEL : CLAUDE_MODEL}`,
    generatedAt: new Date().toISOString(),
    retrievedChunkIds: chunks.map((c) => c.id),
    citations,
    title: result.title,
    oneSentenceSummary: result.oneSentenceSummary,
    body: result.body,
    status: "pending_review",
  };

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(path.join(GENERATED_DIR, `${item.id}.json`), JSON.stringify(item, null, 2), "utf-8");

  return item;
}
