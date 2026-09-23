# novix-rag-test

Werkend prototype van de RAG-pijplijn uit het [Novix backoffice blueprint](https://github.com/SemThe/novix/blob/main/novix-backoffice-blueprint.pdf).
Dit is een losstaand testproject om de architectuur te valideren voordat er een echte
backoffice-UI omheen wordt gebouwd.

Scope volgt blueprint-advies 6.7: er is bewust maar **één opdrachttype** geïmplementeerd
(`digest-artifact`), niet meteen trivia en quizzes tegelijk.

## Architectuur

Volgt blueprint §2 exact:

```
Databronpijplijn:      bronnen (data/sources/*.md) → chunking → embedding → vectorstore
Contentgeneratieflow:  retrieval → AI-generatie (Claude, verplicht gegrond) → reviewwachtrij → (publicatie)
```

| Blueprint-sectie | Bestand |
|---|---|
| 3.1 Bronnenbeheer (metadata, vervaldatum) | `data/sources/*.md` (YAML-frontmatter), `src/types.ts` |
| 3.2 Ingestie & chunking | `src/chunking.ts`, `src/ingest.ts` |
| 3.3 Embedding & vectordatabase | `src/embeddings.ts`, `src/vectorstore.ts` |
| 3.4 Retrieval (semantisch + metadata-filters) | `src/retrieve.ts` |
| 3.5 AI-generatie ("opdrachten") | `src/generate.ts` |
| 3.6 Redactionele review | `src/review.ts` |
| 6.6 Kwaliteitsstatistieken | `stats`-commando in `src/cli.ts` |

Ontwerpkeuzes die direct uit het advies in §6 van het blueprint komen:

- **Geen generatie zonder retrieval** (advies 1): `generateDigestArtifact` gooit een fout
  als er geen (niet-verlopen) fragmenten worden gevonden.
- **Citaties worden gevalideerd, niet vertrouwd** (advies 1, 5): het model levert
  citaties via een verplichte tool call; alle chunk-id's die niet in de opgehaalde set
  zitten worden weggefilterd. Blijft er niets over, dan wordt de output afgewezen in
  plaats van gepubliceerd.
- **Niets gaat automatisch live** (advies 2): elk gegenereerd item krijgt status
  `pending_review` en moet expliciet via `review approve`/`review reject` worden
  afgehandeld.
- **Vervaldatum-mechanisme vanaf dag één** (advies 4): bronnen met een verlopen
  `expiresAt` worden bij ingest overgeslagen en tellen niet mee in retrieval
  (zie `data/sources/nieuws-aow-bedrag-2024.md` als voorbeeld).
- **Traceerbaarheid** (advies 5): elk gegenereerd item bevat `retrievedChunkIds`,
  `citations`, `promptVersion`, `model` en `generatedAt`.
- **Kwaliteitsmeting los van gebruikersstatistieken** (advies 6): `npm run stats`
  toont het percentage ongewijzigd goedgekeurd / bewerkt goedgekeurd / afgewezen.

## Techstack

- **Node.js + TypeScript**, uitgevoerd via `tsx` (geen build-stap nodig).
- **Embeddings**: lokaal via `@huggingface/transformers` (`Xenova/all-MiniLM-L6-v2`, 384
  dimensies). Draait volledig on-device, geen API-key nodig, model wordt bij eerste
  gebruik automatisch gedownload (~90 MB) en gecachet.
- **Vectordatabase**: bewust simpel gehouden — een lokaal JSON-bestand
  (`data/vectorstore.json`) met cosine-similarity search + metadata-filtering
  (vervaldatum, brontype, publicatiedatum). Voor een productie-backoffice is dit het
  eerste onderdeel om te vervangen door een echte vectordatabase (bv. pgvector), maar
  voor een testproject maakt dit de hele pijplijn transparant en inspecteerbaar.
- **Generatie**: providerneutrale laag in `src/llm/` achter een klein interface
  (`LLMProvider.generateDigestArtifact`). Twee providers:
  - `claude` (`src/llm/claude.ts`) — Anthropic API via `@anthropic-ai/sdk`, met een
    verplichte tool call (`submit_digest_artifact`) zodat de output altijd gestructureerd
    is. Kost geld per call, beste kwaliteit.
  - `ollama` (`src/llm/ollama.ts`) — lokaal model via [Ollama](https://ollama.com)
    (standaard `qwen2.5:7b-instruct`), JSON-gedwongen via Ollama's `format: "json"`.
    Gratis en offline, iets minder betrouwbaar in het strikt volgen van instructies dan
    Claude.

  Welke provider gebruikt wordt, staat in `.env` (`GENERATION_PROVIDER`) en kan per
  aanroep overschreven worden met `--provider claude` / `--provider ollama`.

## Setup

```bash
npm install
cp .env.example .env
```

Kies daarna één van de twee generatie-providers in `.env`:

**Optie A — lokaal met Ollama (gratis, geen account nodig)**
```bash
brew install ollama        # of download van https://ollama.com
ollama pull qwen2.5:7b-instruct   # ~4,7 GB, eenmalig
```
Ollama draait daarna vanzelf op de achtergrond (`http://localhost:11434`). Zet in `.env`:
`GENERATION_PROVIDER=ollama`.

**Optie B — Claude via de Anthropic API (beste kwaliteit, betaald)**
```bash
# .env: GENERATION_PROVIDER=claude
# vul ANTHROPIC_API_KEY in .env in (console.anthropic.com)
```

## Gebruik

```bash
# 1. Bronnen inlezen, chunken, embedden
npm run ingest

# 2. Retrieval alleen testen (geen API-key nodig, draait volledig lokaal)
npm run search -- "het pensioenstelsel"
npm run search -- "AOW" --source-type encyclopedisch

# 3. Een digest-artifact genereren, gegrond in retrieval (heeft ANTHROPIC_API_KEY nodig)
npm run generate -- "het nieuwe pensioenstelsel"
npm run generate -- "AOW" --source-type encyclopedisch
npm run generate -- "pensioenakkoord" --since 2024-01-01

# 4. Reviewwachtrij bekijken en afhandelen (niets is live totdat dit gebeurt)
npm run review -- list
npm run review -- approve <id>
npm run review -- approve <id> --edited
npm run review -- reject <id> --reason "feitelijk onjuist"

# 5. Kwaliteitsstatistieken
npm run stats
```

### Voorbeeld: geweigerde generatie

Vraag om een onderwerp waar geen enkele bron over gaat (bv. `npm run generate -- "de
kredietcrisis van 2008"`) en het systeem weigert te genereren in plaats van iets te
verzinnen — dat is het punt van verplichte brongrondslag (blueprint advies 6.1).

## Eigen bronnen toevoegen

Voeg een `.md`-bestand toe aan `data/sources/` met frontmatter:

```yaml
---
title: "Titel van de bron"
type: nieuwsartikel   # of: overheidspublicatie | encyclopedisch | redactionele-notitie
publicationDate: "2025-01-15"
trustLevel: hoog       # hoog | middel | laag
licenseStatus: parafraseren-toegestaan   # of: vrij-te-gebruiken-als-input | niet-toegestaan
expiresAt: "2025-07-01"  # optioneel, voor actualiteitsgevoelige content
---

De inhoud van de bron als lopende tekst, in alinea's.
```

Run daarna opnieuw `npm run ingest`.

> **Copyright-let-op** (blueprint advies 6.3): plak hier geen letterlijke, auteursrechtelijk
> beschermde nieuwsartikelen. De voorbeeldbronnen in dit project zijn zelf geschreven
> samenvattingen, geen kopieën van bestaande publicaties.

## Niet in scope (bewust)

Volgend blueprint-advies 6.7 zijn de volgende dingen **niet** in dit prototype gebouwd —
dat is voor een volgende stap zodra de digest-flow gevalideerd is:

- Trivia- en quiz-opdrachttypen (§3.5)
- Backoffice-UI (bronnenbibliotheek, opdrachtenmodule, contentkalender, §4)
- Gebruikersrollen/rechten (§5)
- Analytics-dashboard (§4)
- Een "echte" vectordatabase i.p.v. het lokale JSON-bestand
