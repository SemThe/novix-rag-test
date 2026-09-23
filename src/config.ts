import "dotenv/config";
import path from "node:path";

export const ROOT_DIR = process.cwd();
export const SOURCES_DIR = path.join(ROOT_DIR, "data", "sources");
export const VECTORSTORE_PATH = path.join(ROOT_DIR, "data", "vectorstore.json");
export const GENERATED_DIR = path.join(ROOT_DIR, "data", "generated");

export const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

// Fragmenten met een cosine-similarity onder deze drempel worden nooit als relevant
// beschouwd, ook niet als ze toevallig in de top-K vallen. Voorkomt dat het systeem bij
// een onderwerp dat geen enkele bron dekt, tóch de "minst irrelevante" fragmenten erbij
// sleept en die als grondslag gebruikt (blueprint advies 6.1).
// 0.4 i.p.v. een lagere waarde: bij een groter/diverser corpus scoort ook een volledig
// ongerelateerde query bijna altijd "toevallig" iets in de 0.2-0.35 range puur door
// taalgelijkenis — geverifieerd met een corpus van 200+ chunks. Dit is een eerste, snelle
// filter; de eigenlijke garantie zit in de expliciete "grounded"-check die het model zelf
// moet invullen (zie src/llm/promptContext.ts).
export const MIN_RELEVANCE_SCORE = Number(process.env.MIN_RELEVANCE_SCORE ?? 0.4);
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
export const PROMPT_VERSION = "opdracht-v1";

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// "claude" (Anthropic API, kwalitatief het beste) of "ollama" (lokaal, geen API-key nodig)
export const GENERATION_PROVIDER = process.env.GENERATION_PROVIDER ?? "claude";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export const SERVER_PORT = Number(process.env.PORT ?? 3001);
