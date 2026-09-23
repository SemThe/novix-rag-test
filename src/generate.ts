import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { CLAUDE_MODEL, GENERATED_DIR, OLLAMA_MODEL, PROMPT_VERSION } from "./config.js";
import { retrieve } from "./retrieve.js";
import { getProvider } from "./llm/index.js";
import type { GeneratedContent, GeneratedItem, OpdrachtType } from "./types.js";

function extractContent(opdrachtType: OpdrachtType, raw: Record<string, unknown>): GeneratedContent {
  if (opdrachtType === "digest-artifact") {
    return { title: raw.title as string, oneSentenceSummary: raw.oneSentenceSummary as string, body: raw.body as string };
  }
  if (opdrachtType === "trivia") {
    return { title: raw.title as string, fact: raw.fact as string };
  }
  return {
    question: raw.question as string,
    options: raw.options as string[],
    correctIndex: raw.correctIndex as number,
    explanation: raw.explanation as string,
  };
}

export async function generateContent(
  opdrachtType: OpdrachtType,
  topic: string,
  opts: {
    instructions?: string;
    topK?: number;
    sourceType?: string;
    sinceDate?: string;
    minScore?: number;
    provider?: string;
  } = {}
): Promise<GeneratedItem> {
  const chunks = await retrieve(topic, opts);
  if (chunks.length === 0) {
    throw new Error(
      `Geen (niet-verlopen) brongrondslag gevonden voor "${topic}". Generatie geweigerd — het systeem genereert nooit zonder retrieval-context (blueprint advies 6.1).`
    );
  }

  const provider = getProvider(opts.provider);
  const retrievedIds = new Set(chunks.map((c) => c.id));

  // Een model dat af en toe een net verkeerd chunk-id citeert is een format-onhebbelijkheid
  // van het model, geen teken dat er geen grondslag is — daarom hier een tweede kans
  // geven voordat we de generatie definitief weigeren. Een expliciete grounded:false is
  // wél meteen definitief: dat is het model dat zelf beoordeelt dat het onderwerp niet
  // door de fragmenten gedekt wordt (of een poging om instructies te laten negeren), en
  // die beoordeling verandert niet door het gewoon nog eens te proberen.
  let raw: Awaited<ReturnType<typeof provider.generate>> | undefined;
  let validCitationIds: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      raw = await provider.generate(opdrachtType, topic, opts.instructions, chunks);
    } catch (err) {
      // De provider heeft zelf al meerdere pogingen gedaan (zie bv. OllamaProvider) en gaf
      // het op — een verwarrende interne foutmelding tonen helpt de gebruiker niet, dus dit
      // wordt netjes als weigering afgehandeld in plaats van als serverfout.
      throw new Error(
        `Generatie geweigerd: ${provider.name} kon geen geldig antwoord genereren na meerdere pogingen ` +
          `(${(err as Error).message.split(":")[0].toLowerCase()}). Probeer het nog eens.`
      );
    }
    if (raw.grounded === false) {
      throw new Error(
        `Generatie geweigerd: de opgehaalde fragmenten dekken "${topic}" niet inhoudelijk genoeg om deze opdracht ` +
          "te onderbouwen. Het systeem genereert nooit zonder echte brongrondslag (blueprint advies 6.1)."
      );
    }
    validCitationIds = (raw.citations ?? []).filter((id) => retrievedIds.has(id));
    if (validCitationIds.length > 0) break;
  }

  if (!raw || validCitationIds.length === 0) {
    throw new Error(
      "Generatie geweigerd: het model gaf geen citaties die terug te herleiden zijn naar de opgehaalde fragmenten " +
        "(mogelijk gehallucineerd). Geen output zonder verifieerbare bronvermelding."
    );
  }

  const citations = validCitationIds.map((chunkId) => {
    const chunk = chunks.find((c) => c.id === chunkId)!;
    return { chunkId, sourceId: chunk.sourceId, sourceTitle: chunk.sourceTitle, text: chunk.text };
  });

  const item: GeneratedItem = {
    id: randomUUID(),
    opdrachtType,
    topic,
    promptVersion: PROMPT_VERSION,
    model: `${provider.name}:${provider.name === "ollama" ? OLLAMA_MODEL : CLAUDE_MODEL}`,
    generatedAt: new Date().toISOString(),
    retrievedChunkIds: chunks.map((c) => c.id),
    citations,
    content: extractContent(opdrachtType, raw),
    status: "pending_review",
  };

  await fs.mkdir(GENERATED_DIR, { recursive: true });
  await fs.writeFile(path.join(GENERATED_DIR, `${item.id}.json`), JSON.stringify(item, null, 2), "utf-8");

  return item;
}
