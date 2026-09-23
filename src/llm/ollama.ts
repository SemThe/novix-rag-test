import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "../config.js";
import { buildContext, DIGEST_ARTIFACT_SYSTEM_PROMPT } from "./promptContext.js";
import type { DigestArtifactResult, LLMProvider } from "./types.js";
import type { RetrievedChunk } from "../types.js";

const JSON_SCHEMA_INSTRUCTIONS = `Antwoord UITSLUITEND met een geldig JSON-object, zonder uitleg eromheen, met exact deze velden:
{
  "title": "korte titel",
  "oneSentenceSummary": "de kern in één zin",
  "body": "het uitlegstuk, 100-200 woorden, uitsluitend gebaseerd op de bronfragmenten",
  "citations": ["chunk-id's die je daadwerkelijk gebruikt hebt, exact zoals gegeven tussen [blokhaken]"]
}`;

function isDigestArtifactResult(value: unknown): value is DigestArtifactResult {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.oneSentenceSummary === "string" &&
    typeof v.body === "string" &&
    Array.isArray(v.citations) &&
    v.citations.every((c) => typeof c === "string")
  );
}

export class OllamaProvider implements LLMProvider {
  name = "ollama";

  async generateDigestArtifact(topic: string, chunks: RetrievedChunk[]): Promise<DigestArtifactResult> {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: `${DIGEST_ARTIFACT_SYSTEM_PROMPT}\n\n${JSON_SCHEMA_INSTRUCTIONS}` },
          {
            role: "user",
            content: `Onderwerp/opdracht: "${topic}"\n\nBeschikbare brondocumenten:\n\n${buildContext(chunks)}`,
          },
        ],
      }),
    }).catch((err) => {
      throw new Error(
        `Kan Ollama niet bereiken op ${OLLAMA_BASE_URL}. Draait Ollama? Start het met 'ollama serve' of open de Ollama-app. (${err.message})`
      );
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Ollama gaf een foutstatus (${response.status}): ${text}`);
    }

    const data = (await response.json()) as { message?: { content?: string } };
    const raw = data.message?.content;
    if (!raw) {
      throw new Error("Ollama gaf geen content terug in de response.");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Ollama-output is geen geldige JSON: ${raw.slice(0, 300)}`);
    }

    if (!isDigestArtifactResult(parsed)) {
      throw new Error(
        `Ollama-output mist verplichte velden of heeft het verkeerde type: ${JSON.stringify(parsed).slice(0, 300)}`
      );
    }

    return parsed;
  }
}
