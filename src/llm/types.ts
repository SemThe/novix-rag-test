import type { RetrievedChunk } from "../types.js";

export interface DigestArtifactResult {
  title: string;
  oneSentenceSummary: string;
  body: string;
  citations: string[];
}

export interface LLMProvider {
  name: string;
  generateDigestArtifact(topic: string, chunks: RetrievedChunk[]): Promise<DigestArtifactResult>;
}
