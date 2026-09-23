import type { RetrievedChunk } from "../types.js";

export function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c) =>
        `[${c.id}] Bron: "${c.sourceTitle}" (${c.sourceType}, gepubliceerd ${c.publicationDate}, betrouwbaarheid: ${c.trustLevel})\n${c.text}`
    )
    .join("\n\n---\n\n");
}

export const DIGEST_ARTIFACT_SYSTEM_PROMPT =
  "Je bent de content-generatielaag van de Novix backoffice. Je maakt een 'digest-artifact' " +
  "uitsluitend op basis van de meegegeven brondocumenten. Verzin nooit feiten die niet in de " +
  "fragmenten staan. Als de fragmenten een vraag niet beantwoorden, zeg dat expliciet in de body " +
  "in plaats van te gokken. Schrijf in het Nederlands.";
