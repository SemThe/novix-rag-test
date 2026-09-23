import "dotenv/config";
import path from "node:path";

export const ROOT_DIR = process.cwd();
export const SOURCES_DIR = path.join(ROOT_DIR, "data", "sources");
export const VECTORSTORE_PATH = path.join(ROOT_DIR, "data", "vectorstore.json");
export const GENERATED_DIR = path.join(ROOT_DIR, "data", "generated");

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
export const PROMPT_VERSION = "digest-artifact-v1";

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// "claude" (Anthropic API, kwalitatief het beste) of "ollama" (lokaal, geen API-key nodig)
export const GENERATION_PROVIDER = process.env.GENERATION_PROVIDER ?? "claude";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
