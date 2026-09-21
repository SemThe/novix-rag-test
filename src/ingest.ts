import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { SOURCES_DIR } from "./config.js";
import { chunkText } from "./chunking.js";
import { embedText } from "./embeddings.js";
import { VectorStore } from "./vectorstore.js";
import type { Chunk, SourceMetadata } from "./types.js";

function assertSourceMetadata(id: string, data: Record<string, unknown>): SourceMetadata {
  const required = ["title", "type", "publicationDate", "trustLevel", "licenseStatus"];
  for (const field of required) {
    if (!data[field]) {
      throw new Error(`Bron "${id}" mist verplicht metadata-veld "${field}"`);
    }
  }
  return { id, ...(data as Omit<SourceMetadata, "id">) };
}

export async function ingestAll(): Promise<{ sources: number; chunks: number; skippedExpired: number }> {
  const store = new VectorStore();
  await store.load();

  const files = (await fs.readdir(SOURCES_DIR)).filter((f) => f.endsWith(".md"));
  let totalChunks = 0;
  let skippedExpired = 0;
  const today = new Date();

  for (const file of files) {
    const sourceId = path.basename(file, ".md");
    const raw = await fs.readFile(path.join(SOURCES_DIR, file), "utf-8");
    const { data, content } = matter(raw);
    const meta = assertSourceMetadata(sourceId, data);

    if (meta.expiresAt && new Date(meta.expiresAt) < today) {
      console.warn(`  overslaan (verlopen sinds ${meta.expiresAt}): ${sourceId}`);
      skippedExpired++;
      store.replaceSourceChunks(sourceId, []);
      continue;
    }

    const textChunks = chunkText(content);
    const chunks: Chunk[] = [];
    for (let i = 0; i < textChunks.length; i++) {
      const text = textChunks[i];
      const embedding = await embedText(text);
      chunks.push({
        id: `${sourceId}#${i}`,
        sourceId: meta.id,
        sourceTitle: meta.title,
        sourceType: meta.type,
        publicationDate: meta.publicationDate,
        trustLevel: meta.trustLevel,
        licenseStatus: meta.licenseStatus,
        expiresAt: meta.expiresAt,
        text,
        embedding,
      });
    }

    store.replaceSourceChunks(sourceId, chunks);
    totalChunks += chunks.length;
    console.log(`  ${sourceId}: ${chunks.length} chunk(s)`);
  }

  await store.save();
  return { sources: files.length, chunks: store.size, skippedExpired };
}
