import type { GeneratedContent, GeneratedItem, OpdrachtType, SourceSummary, Stats } from "./types";

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Serverfout (${res.status})`);
  }
  return data as T;
}

export const api = {
  listSources: () => request<SourceSummary[]>("/api/sources"),

  uploadSource: (form: FormData) =>
    request<SourceSummary>("/api/sources", { method: "POST", body: form }),

  deleteSource: (id: string) => request<void>(`/api/sources/${encodeURIComponent(id)}`, { method: "DELETE" }),

  reingest: () => request<{ sources: number; chunks: number; skippedExpired: number }>("/api/ingest", { method: "POST" }),

  generate: (payload: {
    opdrachtType: OpdrachtType;
    prompt: string;
    instructions?: string;
    sourceType?: string;
    since?: string;
    minScore?: number;
    provider?: string;
  }) =>
    request<GeneratedItem>("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  listGenerated: (status?: "pending_review" | "all") =>
    request<GeneratedItem[]>(`/api/generated${status ? `?status=${status}` : ""}`),

  updateContent: (id: string, content: GeneratedContent) =>
    request<GeneratedItem>(`/api/generated/${encodeURIComponent(id)}/content`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    }),

  approve: (id: string, edited: boolean) =>
    request<GeneratedItem>(`/api/generated/${encodeURIComponent(id)}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edited }),
    }),

  reject: (id: string, reason: string) =>
    request<GeneratedItem>(`/api/generated/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),

  getStats: () => request<Stats>("/api/stats"),
};
