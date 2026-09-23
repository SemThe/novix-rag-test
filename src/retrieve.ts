import { embedText } from "./embeddings.js";
import { VectorStore } from "./vectorstore.js";
import type { RetrievedChunk } from "./types.js";

export async function retrieve(
  topic: string,
  opts: { topK?: number; sourceType?: string; sinceDate?: string; minScore?: number } = {}
): Promise<RetrievedChunk[]> {
  const store = new VectorStore();
  await store.load();
  const queryEmbedding = await embedText(topic);
  return store.search(queryEmbedding, opts);
}
