#!/usr/bin/env node
import { Command } from "commander";
import { ingestAll } from "./ingest.js";
import { retrieve } from "./retrieve.js";
import { generateDigestArtifact } from "./generate.js";
import { listPending, listAll, approve, reject } from "./review.js";

const program = new Command();
program.name("novix-rag").description("Prototype RAG-pijplijn voor de Novix backoffice");

program
  .command("ingest")
  .description("Lees data/sources/*.md in, chunk, embed en sla op in de lokale vectorstore")
  .action(async () => {
    console.log("Ingesting bronnen...");
    const result = await ingestAll();
    console.log(
      `Klaar: ${result.sources} bron(nen) verwerkt, ${result.skippedExpired} verlopen overgeslagen, ${result.chunks} chunk(s) in de vectorstore.`
    );
  });

program
  .command("search")
  .description("Test alleen retrieval (embedding + zoeken) — draait volledig lokaal, geen API-key nodig")
  .argument("<query>", "zoekopdracht, bv. \"het pensioenstelsel\"")
  .option("--top-k <n>", "aantal fragmenten om op te halen", "5")
  .option("--source-type <type>", "filter op brontype")
  .option("--since <date>", "alleen bronnen gepubliceerd na deze datum (YYYY-MM-DD)")
  .option("--min-score <n>", "minimale cosine-similarity om mee te tellen (0-1)")
  .action(async (query: string, options) => {
    const results = await retrieve(query, {
      topK: Number(options.topK),
      sourceType: options.sourceType,
      sinceDate: options.since,
      minScore: options.minScore !== undefined ? Number(options.minScore) : undefined,
    });
    if (results.length === 0) {
      console.log("Geen (niet-verlopen) fragmenten gevonden. Draai eerst 'npm run ingest'.");
      return;
    }
    for (const r of results) {
      console.log(`\n[${r.id}] score ${r.score.toFixed(3)} — "${r.sourceTitle}" (${r.sourceType}, ${r.publicationDate})`);
      console.log(`  ${r.text.slice(0, 200).replace(/\s+/g, " ")}...`);
    }
  });

program
  .command("generate")
  .description("Genereer een digest-artifact, gegrond in retrieval (opdracht type per blueprint advies 6.7)")
  .argument("<topic>", "onderwerp/opdracht, bv. \"het pensioenstelsel\"")
  .option("--top-k <n>", "aantal fragmenten om op te halen", "5")
  .option("--source-type <type>", "filter op brontype")
  .option("--since <date>", "alleen bronnen gepubliceerd na deze datum (YYYY-MM-DD)")
  .option("--min-score <n>", "minimale cosine-similarity om mee te tellen (0-1)")
  .option("--provider <provider>", "\"claude\" of \"ollama\" (overschrijft GENERATION_PROVIDER uit .env)")
  .action(async (topic: string, options) => {
    const item = await generateDigestArtifact(topic, {
      topK: Number(options.topK),
      sourceType: options.sourceType,
      sinceDate: options.since,
      minScore: options.minScore !== undefined ? Number(options.minScore) : undefined,
      provider: options.provider,
    });
    console.log(`\nGegenereerd (status: ${item.status}, id: ${item.id})\n`);
    console.log(`Titel: ${item.title}`);
    console.log(`In één zin: ${item.oneSentenceSummary}\n`);
    console.log(item.body);
    console.log(`\nCitaties: ${item.citations.map((c) => `${c.chunkId} (${c.sourceTitle})`).join(", ")}`);
    console.log(`\nNiets is live: dit item staat in de reviewwachtrij. Gebruik 'npm run review -- list'.`);
  });

const review = program.command("review").description("Redactionele reviewwachtrij (niets gaat automatisch live)");

review
  .command("list")
  .description("Toon items die op goedkeuring wachten")
  .action(async () => {
    const items = await listPending();
    if (items.length === 0) {
      console.log("Reviewwachtrij is leeg.");
      return;
    }
    for (const item of items) {
      console.log(`\n[${item.id}] ${item.title} (${item.topic})`);
      console.log(`  ${item.oneSentenceSummary}`);
      console.log(`  Bronnen: ${item.citations.map((c) => c.sourceTitle).join(", ")}`);
    }
  });

review
  .command("approve")
  .argument("<id>")
  .option("--edited", "markeer als goedgekeurd na bewerking (voor de goedkeuringsstatistiek)", false)
  .action(async (id: string, options) => {
    const item = await approve(id, options.edited);
    console.log(`Goedgekeurd: ${item.title} (status: ${item.status})`);
  });

review
  .command("reject")
  .argument("<id>")
  .requiredOption("--reason <reason>", "reden voor afwijzing, bv. \"feitelijk onjuist\"")
  .action(async (id: string, options) => {
    const item = await reject(id, options.reason);
    console.log(`Afgewezen: ${item.title} (reden: ${item.rejectionReason})`);
  });

program
  .command("stats")
  .description("Kwaliteitsstatistieken over AI-output, los van gebruikersstatistieken (blueprint advies 6.6)")
  .action(async () => {
    const items = await listAll();
    const total = items.length;
    const counts = {
      pending_review: 0,
      approved: 0,
      approved_edited: 0,
      rejected: 0,
    } as Record<string, number>;
    for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;

    console.log(`Totaal gegenereerd: ${total}`);
    for (const [status, count] of Object.entries(counts)) {
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";
      console.log(`  ${status}: ${count} (${pct}%)`);
    }
    const reviewed = counts.approved + counts.approved_edited + counts.rejected;
    if (reviewed > 0) {
      const cleanApprovalRate = ((counts.approved / reviewed) * 100).toFixed(1);
      console.log(`\nGoedgekeurd zonder wijziging (van gereviewde items): ${cleanApprovalRate}%`);
    }
  });

program.parseAsync(process.argv);
