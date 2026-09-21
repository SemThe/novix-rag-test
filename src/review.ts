import { promises as fs } from "node:fs";
import path from "node:path";
import { GENERATED_DIR } from "./config.js";
import type { GeneratedItem } from "./types.js";

async function loadAll(): Promise<GeneratedItem[]> {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const files = (await fs.readdir(GENERATED_DIR)).filter((f) => f.endsWith(".json"));
  const items = await Promise.all(
    files.map(async (f) => JSON.parse(await fs.readFile(path.join(GENERATED_DIR, f), "utf-8")) as GeneratedItem)
  );
  return items.sort((a, b) => a.generatedAt.localeCompare(b.generatedAt));
}

async function loadOne(id: string): Promise<GeneratedItem> {
  const raw = await fs.readFile(path.join(GENERATED_DIR, `${id}.json`), "utf-8");
  return JSON.parse(raw);
}

async function saveOne(item: GeneratedItem): Promise<void> {
  await fs.writeFile(path.join(GENERATED_DIR, `${item.id}.json`), JSON.stringify(item, null, 2), "utf-8");
}

export async function listPending(): Promise<GeneratedItem[]> {
  const items = await loadAll();
  return items.filter((i) => i.status === "pending_review");
}

export async function listAll(): Promise<GeneratedItem[]> {
  return loadAll();
}

export async function approve(id: string, edited: boolean): Promise<GeneratedItem> {
  const item = await loadOne(id);
  item.status = edited ? "approved_edited" : "approved";
  item.reviewedAt = new Date().toISOString();
  await saveOne(item);
  return item;
}

export async function reject(id: string, reason: string): Promise<GeneratedItem> {
  const item = await loadOne(id);
  item.status = "rejected";
  item.reviewedAt = new Date().toISOString();
  item.rejectionReason = reason;
  await saveOne(item);
  return item;
}
