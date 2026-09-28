import type { RetrievedChunk } from "../types.js";

// Voluit geschreven getallen ("twaalf", "vijftien") komen zowel in de bronnen als in
// modeloutput voor (bv. "vijftien titels" i.p.v. "15 titels") — zonder deze mapping mist de
// cijfer-only regex hieronder zo'n claim volledig, waardoor een verzonnen aantal (bv. "twaalf"
// terwijl de bron "vijftien" zegt) ongemerkt door de grounding-check heen glipt.
const DUTCH_NUMBER_WORDS: Record<string, string> = {
  nul: "0", een: "1", twee: "2", drie: "3", vier: "4", vijf: "5", zes: "6", zeven: "7",
  acht: "8", negen: "9", tien: "10", elf: "11", twaalf: "12", dertien: "13", veertien: "14",
  vijftien: "15", zestien: "16", zeventien: "17", achttien: "18", negentien: "19",
  twintig: "20", dertig: "30", veertig: "40", vijftig: "50", zestig: "60", zeventig: "70",
  tachtig: "80", negentig: "90", honderd: "100",
};
const NUMBER_WORD_PATTERN = new RegExp(`\\b(${Object.keys(DUTCH_NUMBER_WORDS).join("|")})\\b`, "gi");

// 2-4 cijfers: jaartallen, percentages, aantallen. Losse cijfers (bv. "3 feiten") negeren we
// bewust, die zijn vrijwel nooit een feitelijke claim die aparte brongrondslag behoeft. "een"
// wordt bewust NIET als telwoord meegenomen (te veel valse treffers als lidwoord).
export function extractNumbers(text: string): string[] {
  const digits = text.match(/\b\d{2,4}\b/g) ?? [];
  const words = (text.match(NUMBER_WORD_PATTERN) ?? [])
    .map((w) => DUTCH_NUMBER_WORDS[w.toLowerCase()])
    .filter((n) => n !== "1" && n !== "0");
  return [...digits, ...words];
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
