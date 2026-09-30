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

  countBySource(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const c of this.chunks) counts.set(c.sourceId, (counts.get(c.sourceId) ?? 0) + 1);
    return counts;
  }

  /**
   * Semantisch zoeken met verplichte vervaldatum-filtering (blueprint 3.1/3.4):
   * verlopen bronnen wegen nooit mee in retrieval.
   */
  search(
    queryEmbedding: number[],
    opts: { topK?: number; sourceType?: string; sinceDate?: string; minScore?: number } = {}
  ): RetrievedChunk[] {
    // Minder (maar relevantere) fragmenten in de prompt betekent een kortere generatietijd
    // én, belangrijker, houdt het lokale model gefocust: bij een test met topK=20 verloor
    // het model de daadwerkelijk gestelde vraag soms volledig uit het oog (het verzon een
    // andere vraag over een ander jaar dat ook in de pool zat, en citeerde zelfs een niet-
    // bestaand fragment-ID) — te veel concurrerende feiten in de context werkt averechts,
    // ook al is de totale tekstgrootte klein. De bronnen zijn daarom herschreven zodat elk
    // fragment met de vraagvorm begint (bv. "Wie won de Ballon d'Or in 1997?"), wat de
    // ranking van het juiste fragment sterk verbetert — maar als bijeffect scoren nu ook
    // ALLE andere jaren van dezelfde bron hoog (ze delen dezelfde vraagvorm), waardoor het
    // ene specifieke jaar soms nét op rang 6-8 valt in plaats van de top 5. topK=8 vangt die
    // marge op zonder terug te vallen in het "te veel fragmenten"-probleem van topK=20.
    const { topK = 8, sourceType, sinceDate, minScore = MIN_RELEVANCE_SCORE } = opts;
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
