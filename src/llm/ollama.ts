import { OLLAMA_BASE_URL, OLLAMA_MODEL } from "../config.js";
import { BASE_SYSTEM_PROMPT, buildContext, OPDRACHT_SPECS } from "./promptContext.js";
import type { DigestArtifactResult, LLMProvider } from "./types.js";
import type { OpdrachtType, RetrievedChunk } from "../types.js";

const MAX_ATTEMPTS = 3;

function schemaInstructions(opdrachtType: OpdrachtType): string {
  const spec = OPDRACHT_SPECS[opdrachtType];
  return `Antwoord UITSLUITEND met een geldig JSON-object, zonder uitleg eromheen, met exact deze velden (plus "citations"):
${spec.schemaDescription.replace(/}\s*$/, `,\n  "citations": ["de chunk-id's die je daadwerkelijk gebruikt hebt, bv. \\"bron-1#0\\" — ZONDER blokhaken eromheen"]\n}`)}`;
}

function isNonEmptyRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

// Woorden die vrijwel alleen in het Nederlands resp. Engels voorkomen (dus geen "is"/"was"/
// "in", die in beide talen identiek zijn). Lokale modellen "vallen terug" soms volledig op de
// brontaal ondanks expliciete instructies — dit is een programmatische vangnet daarvoor,
// niet alleen een promptaanpassing (die bleek onvoldoende betrouwbaar in de praktijk).
const DUTCH_SIGNAL_WORDS = new Set([
  "de", "het", "een", "van", "en", "dat", "die", "niet", "voor", "met", "wordt", "werd",
  "deze", "dit", "hun", "zijn", "moet", "kan", "ook", "maar", "dan", "wat", "hij", "uit",
  "naar", "bij", "om", "aan", "door", "geen", "wel", "toch", "dus", "omdat", "terwijl", "tijdens",
]);
const ENGLISH_SIGNAL_WORDS = new Set([
  "the", "and", "of", "that", "with", "his", "her", "their", "from", "this", "these",
  "were", "been", "have", "has", "which", "who", "but", "are", "for", "while", "during", "because",
]);

function extractTextForLanguageCheck(value: Record<string, unknown>): string {
  const parts: unknown[] = [value.title, value.oneSentenceSummary, value.body, value.fact, value.question, value.explanation];
  if (Array.isArray(value.options)) parts.push(...value.options);
  return parts.filter((p) => typeof p === "string").join(" ");
}

function looksLikeNonDutch(text: string): boolean {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) ?? [];
  let dutchScore = 0;
  let englishScore = 0;
  for (const w of words) {
    if (DUTCH_SIGNAL_WORDS.has(w)) dutchScore++;
    if (ENGLISH_SIGNAL_WORDS.has(w)) englishScore++;
  }
  // Pas afkeuren bij een duidelijk signaal, om korte/neutrale tekst niet vals te flaggen.
  return englishScore >= 3 && englishScore > dutchScore;
}

function isValidResult(opdrachtType: OpdrachtType, value: unknown): value is DigestArtifactResult {
  if (!isNonEmptyRecord(value)) return false;
  if (typeof value.grounded !== "boolean") return false;

  // Bij grounded:false gaat generateContent() dit sowieso als weigering behandelen —
  // de overige velden negeren we dan, dus die hoeven niet aan het volledige schema te
  // voldoen (het model mag ze leeg laten in plaats van een quizvraag te verzinnen).
  if (value.grounded === false) return true;

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
    let lastError: Error | undefined;
    let correction: string | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        return await this.attemptOnce(opdrachtType, topic, instructions, chunks, correction, attempt);
      } catch (err) {
        lastError = err as Error;
        // Alleen retrien op een format-fout van het lokale model (ongeldige JSON, schema-
        // mismatch, of verkeerde taal) — niet op netwerk-/HTTP-fouten, die falen meteen door.
        if (lastError.message.includes("geen geldige JSON") || lastError.message.includes("mist verplichte velden")) {
          correction =
            "LET OP: je vorige antwoord voldeed niet aan het gevraagde JSON-schema (verplicht veld ontbrak of " +
            "had het verkeerde type). Lever nu een antwoord dat EXACT aan het schema voldoet.";
        } else if (lastError.message.includes("lijkt niet in het Nederlands")) {
          correction =
            "LET OP: je vorige antwoord was (grotendeels) in het Engels. Dat is niet toegestaan. Schrijf dit " +
            "keer de VOLLEDIGE inhoud van elk veld — titel, vraag, opties, toelichting, alles — in vloeiend " +
            "Nederlands, ook al is de brontekst Engelstalig.";
        } else {
          throw lastError; // netwerk-/HTTP-fout: niet retryen
        }
        if (attempt === MAX_ATTEMPTS) throw lastError;
      }
    }
    throw lastError;
  }

  private async attemptOnce(
    opdrachtType: OpdrachtType,
    topic: string,
    instructions: string | undefined,
    chunks: RetrievedChunk[],
    correction: string | undefined,
    attempt: number
  ): Promise<DigestArtifactResult> {
    const spec = OPDRACHT_SPECS[opdrachtType];

    const userPrompt = [
      correction,
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
        // Lager dan Ollama's default (~0.8): dit is gestructureerde, gegronde output waarbij
        // chunk-id's letterlijk correct moeten zijn, geen vrije creatieve tekst. Te hoge
        // temperature liet het model af en toe een net verkeerd chunk-id citeren of het
        // schema niet volgen, wat de generatie onnodig liet mislukken op verificatie in
        // plaats van op inhoud. Bij een retry (correction is dan gezet) juist iets hoger dan
        // de eerste poging: bij 0.4 herhaalt het model anders soms haast letterlijk dezelfde
        // (foute) output, wat een retry zinloos maakt.
        options: { temperature: correction ? 0.4 + 0.15 * attempt : 0.4 },
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

    if (parsed.grounded !== false && looksLikeNonDutch(extractTextForLanguageCheck(parsed))) {
      throw new Error(`Ollama-output lijkt niet in het Nederlands te zijn: ${JSON.stringify(parsed).slice(0, 300)}`);
    }

    // Lokale modellen volgen het schema minder strikt dan Claude's tool-calling; citaties
    // komen soms nog met [blokhaken] of witruimte terug ondanks de instructie. Opschonen
    // in plaats van de hele generatie afwijzen op een cosmetisch verschil.
    const citations = Array.isArray(parsed.citations) ? parsed.citations : [];
    return {
      ...parsed,
      citations: citations.map((c) => String(c).trim().replace(/^\[|\]$/g, "")),
    };
  }
}
