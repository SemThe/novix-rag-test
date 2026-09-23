import type { OpdrachtType, RetrievedChunk } from "../types.js";

// Ruwe modeloutput: de content-velden voor het gevraagde opdrachtType, plus citaties
// (nog niet gevalideerd tegen de opgehaalde chunk-set — dat gebeurt in generate.ts).
export interface DigestArtifactResult {
  [field: string]: unknown;
  citations: string[];
}

export interface LLMProvider {
  name: string;
  generate(
    opdrachtType: OpdrachtType,
    topic: string,
    instructions: string | undefined,
    chunks: RetrievedChunk[]
  ): Promise<DigestArtifactResult>;
}
