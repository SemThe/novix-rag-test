# novix-rag-test

Werkend prototype van de RAG-pijplijn uit het [Novix backoffice blueprint](https://github.com/SemThe/novix/blob/main/novix-backoffice-blueprint.pdf),
inclusief een backoffice-webinterface: bronnen uploaden, content genereren via een
promptbox, en een reviewwachtrij.

Drie opdrachttypen zijn geïmplementeerd: **digest-artifact**, **trivia** en **quiz**
(blueprint §3.5).

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
| 3.5 AI-generatie ("opdrachten": digest-artifact, trivia, quiz) | `src/generate.ts`, `src/llm/` |
| 3.6 Redactionele review (incl. bewerken vóór goedkeuren) | `src/review.ts` |
| §4 Backoffice-UI (bronnenbibliotheek, opdrachtenmodule, reviewwachtrij) | `src/server/` (API), `web/` (React-frontend) |
| 6.6 Kwaliteitsstatistieken | `GET /api/stats`, `stats`-commando in `src/cli.ts` |

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

## Backoffice-UI (web)

Een React-admin panel bovenop dezelfde pijplijn (geen aparte state, gewoon een UI voor
`src/ingest.ts`, `src/generate.ts`, `src/review.ts` via een Express-API in `src/server/`):

- **Bronnen** (`/bronnen`) — bronnen uploaden (`.txt`, `.md`, `.pdf`) met metadata-formulier
  (type, publicatiedatum, betrouwbaarheid, licentiestatus, vervaldatum). Upload triggert
  automatisch een her-index. PDF-tekst wordt server-side geëxtraheerd (`pdf-parse`); alleen
  de geëxtraheerde tekst wordt opgeslagen, niet het originele bestand.
- **Genereren** (`/genereren`) — een promptbox: kies opdrachttype (digest-artifact / trivia
  / quiz), typ een onderwerp of opdracht ("maak een lastige quizvraag over de
  AOW-leeftijd"), optioneel extra instructies en filters (brontype, datum, provider). Bij
  een geweigerde generatie (geen brongrondslag) verschijnt dat expliciet in de UI, niet als
  vage foutmelding.
- **Review** (`/review`) — de reviewwachtrij met brontekst direct zichtbaar naast de
  gegenereerde content (blueprint 3.6). Bewerken vóór goedkeuren is een echte inline-editor
  per opdrachttype, geen losse claim.
- **Dashboard** (`/`) — bronnen-/generatie-/reviewtellingen en het schone-goedkeuringspercentage.

Starten (twee servers, API + web):

```bash
npm install                # eenmalig, in de projectroot
cd web && npm install && cd ..   # eenmalig, de frontend heeft een eigen package.json
npm run dev                 # start API (poort 3001) en web (poort 5173) samen
```

Open daarna `http://localhost:5173`. De Vite dev-server proxyt `/api/*` naar de Express-API,
dus er is geen CORS-configuratie nodig.

Los van elkaar starten kan ook: `npm run server` (alleen de API) of `npm run dev --prefix
web` (alleen de frontend, verwacht dan wel dat de API al draait).

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

# 3. Content genereren, gegrond in retrieval (--type: digest-artifact | trivia | quiz)
#    (gebruikt de provider uit .env — claude of ollama; zie hierboven)
npm run generate -- "het nieuwe pensioenstelsel"
npm run generate -- "AOW" --type trivia --source-type encyclopedisch
npm run generate -- "het nieuwe pensioenstelsel" --type quiz

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
beste kattenrassen voor een appartement"`) en het systeem weigert te genereren in plaats
van iets te verzinnen — dat is het punt van verplichte brongrondslag (blueprint advies
6.1). Retrieval gebruikt hiervoor een minimale relevantiedrempel (`MIN_RELEVANCE_SCORE`
in `.env`, standaard 0.2): fragmenten die er wel "toevallig" het minst slecht bijpassen,
maar feitelijk niet relevant zijn, tellen niet mee.

**Bekende beperking van dit testcorpus:** met slechts een handjevol bronnen (allemaal
over pensioenen/AOW) kan een onderwerp dat qua taalgebruik aanpalend is — bv. "de
kredietcrisis van 2008", ook financieel/economisch van aard — soms toch net boven de
drempel scoren en verkeerd gegronde content opleveren. Dat is een verwacht effect van een
klein corpus, niet een principiële tekortkoming van de aanpak: met meer en diversere
bronnen (zoals in een echte backoffice) wordt de scheiding tussen relevant/irrelevant
vanzelf scherper. Verhoog `MIN_RELEVANCE_SCORE` of voeg meer bronnen toe als dit in de
praktijk een probleem blijkt.

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

Deze dingen zijn **niet** in dit prototype gebouwd:

- Contentkalender / inplannen van publicatie (§4)
- Gebruikersrollen/rechten — bronbeheerder/redacteur/beheerder-onderscheid (§5)
- Analytics-dashboard (gebruiksstatistieken uit de consumentenapp, §4)
- Authenticatie — de API heeft geen login, bedoeld voor lokaal gebruik
- Een "echte" vectordatabase i.p.v. het lokale JSON-bestand
- Daadwerkelijke publicatie naar een consumentenapp (goedgekeurde items blijven in de
  reviewwachtrij staan met status `approved`/`approved_edited`)
