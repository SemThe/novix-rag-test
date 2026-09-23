import { promises as fs } from "node:fs";
import path from "node:path";
import { MIN_RELEVANCE_SCORE, VECTORSTORE_PATH } from "./config.js";
import { cosineSimilarity } from "./embeddings.js";
import type { Chunk, RetrievedChunk } from "./types.js";

export class VectorStore {
  private chunks: Chunk[] = [];

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(VECTORSTORE_PATH, "utf-8");
      this.chunks = JSON.parse(raw);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
      this.chunks = [];
    }
  }

  async save(): Promise<void> {
    await fs.mkdir(path.dirname(VECTORSTORE_PATH), { recursive: true });
    await fs.writeFile(VECTORSTORE_PATH, JSON.stringify(this.chunks, null, 2), "utf-8");
  }

  replaceSourceChunks(sourceId: string, chunks: Chunk[]): void {
    this.chunks = this.chunks.filter((c) => c.sourceId !== sourceId);
    this.chunks.push(...chunks);
  }

  get size(): number {
    return this.chunks.length;
  }

  /**
   * Semantisch zoeken met verplichte vervaldatum-filtering (blueprint 3.1/3.4):
   * verlopen bronnen wegen nooit mee in retrieval.
   */
  search(
    queryEmbedding: number[],
    opts: { topK?: number; sourceType?: string; sinceDate?: string; minScore?: number } = {}
  ): RetrievedChunk[] {
    const { topK = 5, sourceType, sinceDate, minScore = MIN_RELEVANCE_SCORE } = opts;
    const now = new Date();

    const candidates = this.chunks.filter((c) => {
      if (c.expiresAt && new Date(c.expiresAt) < now) return false;
      if (sourceType && c.sourceType !== sourceType) return false;
      if (sinceDate && new Date(c.publicationDate) < new Date(sinceDate)) return false;
      return true;
    });

    return candidates
      .map((c) => ({ ...c, score: cosineSimilarity(queryEmbedding, c.embedding) }))
      .filter((c) => c.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
