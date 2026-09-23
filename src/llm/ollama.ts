import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "../config.js";
import { BASE_SYSTEM_PROMPT, buildContext, OPDRACHT_SPECS } from "./promptContext.js";
import type { DigestArtifactResult, LLMProvider } from "./types.js";
import type { OpdrachtType, RetrievedChunk } from "../types.js";

function schemaInstructions(opdrachtType: OpdrachtType): string {
  const spec = OPDRACHT_SPECS[opdrachtType];
  return `Antwoord UITSLUITEND met een geldig JSON-object, zonder uitleg eromheen, met exact deze velden (plus "citations"):
${spec.schemaDescription.replace(/}\s*$/, `,\n  "citations": ["de chunk-id's die je daadwerkelijk gebruikt hebt, bv. \\"bron-1#0\\" — ZONDER blokhaken eromheen"]\n}`)}`;
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidResult(opdrachtType: OpdrachtType, value: unknown): value is DigestArtifactResult {
  if (!isNonEmptyRecord(value)) return false;
  if (!Array.isArray(value.citations) || !value.citations.every((c) => typeof c === "string")) return false;

  if (opdrachtType === "digest-artifact") {
    return typeof value.title === "string" && typeof value.oneSentenceSummary === "string" && typeof value.body === "string";
  }
  if (opdrachtType === "trivia") {
    return typeof value.title === "string" && typeof value.fact === "string";
  }
  // quiz
  return (
    typeof value.question === "string" &&
    Array.isArray(value.options) &&
    value.options.length === 4 &&
    value.options.every((o) => typeof o === "string") &&
    typeof value.correctIndex === "number" &&
    typeof value.explanation === "string"
  );
}

export class OllamaProvider implements LLMProvider {
  name = "ollama";

  async generate(
    opdrachtType: OpdrachtType,
    topic: string,
    instructions: string | undefined,
    chunks: RetrievedChunk[]
  ): Promise<DigestArtifactResult> {
    const spec = OPDRACHT_SPECS[opdrachtType];

    const userPrompt = [
      `Opdracht: ${spec.instructions}`,
      `Onderwerp: "${topic}"`,
      instructions ? `Extra instructies van de redacteur: ${instructions}` : null,
      `Beschikbare brondocumenten:\n\n${buildContext(chunks)}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: `${BASE_SYSTEM_PROMPT}\n\n${schemaInstructions(opdrachtType)}` },
          { role: "user", content: userPrompt },
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

    if (!isValidResult(opdrachtType, parsed)) {
      throw new Error(
        `Ollama-output mist verplichte velden of heeft het verkeerde type: ${JSON.stringify(parsed).slice(0, 300)}`
      );
    }

    // Lokale modellen volgen het schema minder strikt dan Claude's tool-calling; citaties
    // komen soms nog met [blokhaken] of witruimte terug ondanks de instructie. Opschonen
    // in plaats van de hele generatie afwijzen op een cosmetisch verschil.
    return {
      ...parsed,
      citations: parsed.citations.map((c) => c.trim().replace(/^\[|\]$/g, "")),
    };
  }
}
