import type { OpdrachtType, RetrievedChunk } from "../types.js";

export function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c) =>
        `[${c.id}] Bron: "${c.sourceTitle}" (${c.sourceType}, gepubliceerd ${c.publicationDate}, betrouwbaarheid: ${c.trustLevel})\n${c.text}`
    )
    .join("\n\n---\n\n");
}

export const BASE_SYSTEM_PROMPT =
  "Je bent de content-generatielaag van de Novix backoffice. Je maakt content " +
  "uitsluitend op basis van de meegegeven brondocumenten. Verzin nooit feiten die niet in " +
  "de fragmenten staan. Als de fragmenten de opdracht niet kunnen onderbouwen, zeg dat dan " +
  "expliciet in plaats van te gokken. Schrijf in het Nederlands.";

interface OpdrachtSpec {
  instructions: string;
  toolDescription: string;
  schemaDescription: string;
}

export const OPDRACHT_SPECS: Record<OpdrachtType, OpdrachtSpec> = {
  "digest-artifact": {
    instructions:
      "Maak een digest-artifact: een kort uitlegstuk (100-200 woorden) met een 'in één zin'-samenvatting.",
    toolDescription:
      "Lever een digest-artifact aan: een kort uitlegstuk met een 'in één zin'-samenvatting, uitsluitend gebaseerd op de meegegeven brondocumenten.",
    schemaDescription: `{
  "title": "korte titel",
  "oneSentenceSummary": "de kern in één zin",
  "body": "het uitlegstuk, 100-200 woorden, uitsluitend gebaseerd op de bronfragmenten"
}`,
  },
  trivia: {
    instructions: "Maak één trivia-item: een enkel, verrassend of interessant feit, geschikt voor een los kaartje.",
    toolDescription: "Lever een trivia-item aan: één feit, uitsluitend gebaseerd op de meegegeven brondocumenten.",
    schemaDescription: `{
  "title": "korte titel voor het kaartje",
  "fact": "het feit zelf, 1-3 zinnen, uitsluitend gebaseerd op de bronfragmenten"
}`,
  },
  quiz: {
    instructions:
      "Maak één meerkeuzevraag: 4 antwoordopties (één correct, drie geloofwaardige afleiders) en een korte toelichting op het juiste antwoord.",
    toolDescription:
      "Lever een quizvraag aan: een meerkeuzevraag met 4 opties en een toelichting, uitsluitend gebaseerd op de meegegeven brondocumenten.",
    schemaDescription: `{
  "question": "de vraag",
  "options": ["optie A", "optie B", "optie C", "optie D"],
  "correctIndex": 0,
  "explanation": "korte toelichting waarom dit antwoord klopt, met verwijzing naar de bron"
}`,
  },
};
