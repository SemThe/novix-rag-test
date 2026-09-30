import { embedText } from "./embeddings.js";
import { VectorStore } from "./vectorstore.js";
import type { RetrievedChunk } from "./types.js";

// Redacteuren typen in de prompt-box vaak een volledige opdrachtzin ("Maak een vraag over
// wie de Ballon d'Or won in 1997") in plaats van een kort onderwerp ("Ballon d'Or 1997").
// Die inleidende instructiewoorden dragen geen onderwerp-signaal, maar verdunnen embedding-
// gewijs wél het aandeel van de woorden die er WEL toe doen — gemeten effect: dezelfde vraag
// zonder dit voorvoegsel scoorde de juiste bron als #1 resultaat, terwijl de volledige zin
// 'm zelfs buiten de top-8 duwde. Dit strippen we daarom vóór de retrieval-embedding wordt
// berekend (de oorspronkelijke topic-tekst blijft ongewijzigd voor opslag/weergave).
const INSTRUCTION_PREFIX_PATTERN =
  /^(maak|genereer|schrijf|stel|bedenk|geef)\s+(een\s+)?(korte\s+)?(vraag|quiz(vraag)?|trivia(-?item)?|feit|digest|artikel|samenvatting)(-?item)?\s*(over|voor|rond|met betrekking tot)?\s*/i;

function cleanTopicForRetrieval(topic: string): string {
  return topic.replace(INSTRUCTION_PREFIX_PATTERN, "").trim() || topic;
}

export async function retrieve(
  topic: string,
  opts: { topK?: number; sourceType?: string; sinceDate?: string; minScore?: number } = {}
): Promise<RetrievedChunk[]> {
  const store = new VectorStore();
  await store.load();
  const queryEmbedding = await embedText(cleanTopicForRetrieval(topic));
  return store.search(queryEmbedding, opts);
}
