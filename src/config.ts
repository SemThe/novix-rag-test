import "dotenv/config";
import path from "node:path";

export const ROOT_DIR = process.cwd();
export const SOURCES_DIR = path.join(ROOT_DIR, "data", "sources");
export const VECTORSTORE_PATH = path.join(ROOT_DIR, "data", "vectorstore.json");
export const GENERATED_DIR = path.join(ROOT_DIR, "data", "generated");

export const EMBEDDING_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

// Fragmenten met een cosine-similarity onder deze drempel worden nooit als relevant
// beschouwd, ook niet als ze toevallig in de top-K vallen. Dit is bewust een LAGE, grove
// eerste filter (alleen bedoeld om evident niets-met-elkaar-te-maken content eruit te
// halen, bv. "recept voor appeltaart" scoort ~0), geen betrouwbaarheidsgarantie op zich.
//
// Eerder stond dit op 0.4 om een prompt-injectiepoging tegen te houden die bij een groot
// corpus (200+ chunks) toevallig ~0.30-0.33 scoorde. Bleek een verkeerde oplossing: een
// kórte maar wél terecht gedekte zoekopdracht (bv. "AOW") scoort tegen datzelfde grote
// corpus soms lager (~0.29) dan die ongerelateerde ruis — er bestaat dus geen vaste
// drempel die beide gevallen correct uit elkaar houdt. De echte garantie zit in de
// verplichte "grounded"-zelfcontrole die het model per antwoord moet invullen (zie
// src/llm/promptContext.ts): die beoordeelt de daadwerkelijke inhoud, niet alleen een
// similarity-getal, en ving de injectiepoging al af vóórdat deze drempel weer omlaag ging.
export const MIN_RELEVANCE_SCORE = Number(process.env.MIN_RELEVANCE_SCORE ?? 0.2);
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
export const PROMPT_VERSION = "opdracht-v1";

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// "claude" (Anthropic API, kwalitatief het beste) of "ollama" (lokaal, geen API-key nodig)
export const GENERATION_PROVIDER = process.env.GENERATION_PROVIDER ?? "claude";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct";
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

export const SERVER_PORT = Number(process.env.PORT ?? 3001);
