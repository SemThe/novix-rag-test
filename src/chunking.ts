/**
 * Knipt tekst op in overlappende fragmenten van ~targetWords woorden, op alinea-grenzen
 * (blueprint 3.2). Voor andere brontypen (bv. wetsartikelen per artikellid) kan een eigen
 * chunker worden toegevoegd; dit is de generieke alinea-gebaseerde variant.
 */
export function chunkText(text: string, targetWords = 350, overlapWords = 60): string[] {
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

      const prevWords = current.join(" ").split(/\s+/).filter(Boolean);
      const overlapText = prevWords.slice(-overlapWords).join(" ");
      current = overlapText ? [overlapText] : [];
      currentWordCount = overlapText ? overlapText.split(/\s+/).filter(Boolean).length : 0;
    }

    current.push(para);
    currentWordCount += paraWordCount;
  }

  if (current.length > 0) chunks.push(current.join("\n\n"));
  return chunks;
}
