import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";
import { EMBEDDING_MODEL } from "./config.js";

let extractor: FeatureExtractionPipeline | undefined;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = (await pipeline("feature-extraction", EMBEDDING_MODEL)) as FeatureExtractionPipeline;
  }
  return extractor;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getExtractor();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    embeddings.push(await embedText(text));
  }
  return embeddings;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // embeddings are already L2-normalized, so cosine similarity reduces to the dot product
  return dot;
}
