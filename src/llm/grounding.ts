import type { RetrievedChunk } from "../types.js";

// 2-4 cijfers: jaartallen, percentages, aantallen. Losse cijfers (bv. "3 feiten") negeren we
// bewust, die zijn vrijwel nooit een feitelijke claim die aparte brongrondslag behoeft.
export function extractNumbers(text: string): string[] {
  return text.match(/\b\d{2,4}\b/g) ?? [];
}

// Een cijfer dat toevallig ELDERS in de opgehaalde pool voorkomt (bv. een jaartal uit een
// compleet ander brondocument) mag een claim niet "grondslag" geven. Daarom controleren we
// altijd tegen de fragmenten die het model daadwerkelijk citeert voor deze generatie, niet
// tegen de hele opgehaalde pool — anders "leent" een niet-relevant fragment zijn cijfers aan
// een claim die er inhoudelijk niets mee te doen heeft (bv. een jaartal uit een Champions
// League-fragment dat een Ballon d'Or-claim over een heel ander jaar lijkt te dekken).
export function findUnsourcedNumbers(numbers: string[], citedChunks: RetrievedChunk[]): string[] {
  const sourceNumbers = new Set(extractNumbers(citedChunks.map((c) => c.text).join(" ")));
  return [...new Set(numbers)].filter((n) => !sourceNumbers.has(n));
}
