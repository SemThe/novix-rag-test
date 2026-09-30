/**
 * Knipt tekst op in overlappende fragmenten van ~targetWords woorden, op alinea-grenzen
 * (blueprint 3.2). Voor andere brontypen (bv. wetsartikelen per artikellid) kan een eigen
 * chunker worden toegevoegd; dit is de generieke alinea-gebaseerde variant.
 */
// Kleiner dan het vroegere default van 350: bij bronnen die uit veel korte, zelfstandige
// feiten bestaan (bv. één regel per jaartal) bundelde 350 woorden tien of meer jaartallen
// in één fragment. Zo'n fragment retrieven voor een vraag over ÉÉN specifiek jaar dilueert
// de embedding met tien ongerelateerde jaartallen. Ook 120 woorden bleek nog te veel: dat
// bundelde nog 3-4 jaartallen per fragment, en de standaard overlap liet bovendien een
// stukje van het VORIGE jaartal in elk nieuw fragment lekken — waardoor de embedding van
// bv. het "1997"-fragment zwaarder werd beïnvloed door 1995/1996/1998 dan door 1997 zelf.
// Bij deze bronnen is elke alinea al een zelfstandig, compleet feit (blueprint: één
// jaartal/gebeurtenis per alinea) — overlap tussen alinea's is dan niet nodig, dat is enkel
// bedoeld om lopende tekst niet midden in een zin te knippen. targetWords=45 is net iets
// meer dan de lengte van zo'n alinea, zodat vrijwel elke alinea zijn eigen fragment krijgt.
export function chunkText(text: string, targetWords = 45, overlapWords = 0): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current: string[] = [];
  let currentWordCount = 0;

  for (const para of paragraphs) {
    const paraWordCount = para.split(/\s+/).filter(Boolean).length;

    if (currentWordCount + paraWordCount > targetWords && current.length > 0) {
      chunks.push(current.join("\n\n"));

      // let op: Array.prototype.slice(-0) is gelijk aan slice(0) (de HELE array) in
      // JavaScript, niet "niets" — dus overlapWords=0 moet hier expliciet worden afgevangen,
      // anders lekt bij "geen overlap" juist het hele vorige fragment mee.
      const prevWords = current.join(" ").split(/\s+/).filter(Boolean);
      const overlapText = overlapWords > 0 ? prevWords.slice(-overlapWords).join(" ") : "";
      current = overlapText ? [overlapText] : [];
      currentWordCount = overlapText ? overlapText.split(/\s+/).filter(Boolean).length : 0;
    }

    current.push(para);
    currentWordCount += paraWordCount;
  }

  if (current.length > 0) chunks.push(current.join("\n\n"));
  return chunks;
}
