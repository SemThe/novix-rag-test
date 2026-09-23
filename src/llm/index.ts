import { GENERATION_PROVIDER } from "../config.js";
import { ClaudeProvider } from "./claude.js";
import { OllamaProvider } from "./ollama.js";
import type { LLMProvider } from "./types.js";

export function getProvider(override?: string): LLMProvider {
  const provider = override ?? GENERATION_PROVIDER;
  if (provider === "ollama") return new OllamaProvider();
  if (provider === "claude") return new ClaudeProvider();
  throw new Error(`Onbekende GENERATION_PROVIDER "${provider}". Gebruik "claude" of "ollama".`);
}

export type { LLMProvider, DigestArtifactResult } from "./types.js";
