import { useState } from "react";
import type { DigestArtifactContent, GeneratedItem, QuizContent, TriviaContent } from "../api/types";
import { Badge } from "./Badge";
import { IconCheck, IconChevronDown } from "./icons";
import { formatDateTime, opdrachtLabel, statusLabel, statusTone } from "../lib/format";

export function GeneratedContentView({ item, defaultSourcesOpen = false }: { item: GeneratedItem; defaultSourcesOpen?: boolean }) {
  const [sourcesOpen, setSourcesOpen] = useState(defaultSourcesOpen);

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{opdrachtLabel[item.opdrachtType]}</Badge>
        <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
        <span className="text-xs text-ink-faint">{formatDateTime(item.generatedAt)}</span>
        <span className="ml-auto font-mono text-[11px] text-ink-faint">{item.model}</span>
      </div>

      <ContentBody item={item} />

      {item.status === "rejected" && item.rejectionReason && (
        <div className="mt-4 rounded-lg border border-danger/20 bg-danger-soft px-3.5 py-2.5 text-sm text-ink">
          <span className="font-medium">Reden van afwijzing: </span>
          {item.rejectionReason}
        </div>
      )}

      <button
        onClick={() => setSourcesOpen((v) => !v)}
        className="mt-4 flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-ink"
      >
        <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sourcesOpen ? "rotate-180" : ""}`} />
        {item.citations.length} bronfragment{item.citations.length === 1 ? "" : "en"} gebruikt
      </button>

      {sourcesOpen && (
        <div className="mt-3 space-y-2.5">
          {item.citations.map((c) => (
            <div key={c.chunkId} className="rounded-lg border border-border bg-surface-sunken px-3.5 py-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink">{c.sourceTitle}</p>
                <span className="font-mono text-[10px] text-ink-faint">{c.chunkId}</span>
              </div>
              <p className="text-xs leading-relaxed text-ink-muted">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentBody({ item }: { item: GeneratedItem }) {
  if (item.opdrachtType === "digest-artifact") {
    const c = item.content as DigestArtifactContent;
    return (
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-ink">{c.title}</h3>
        <p className="mt-1 text-sm font-medium italic text-ink-muted">{c.oneSentenceSummary}</p>
        <p className="mt-3 text-sm leading-relaxed text-ink">{c.body}</p>
      </div>
    );
  }

  if (item.opdrachtType === "trivia") {
    const c = item.content as TriviaContent;
    return (
      <div>
        <h3 className="text-lg font-semibold tracking-[-0.01em] text-ink">{c.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink">{c.fact}</p>
      </div>
    );
  }

  const c = item.content as QuizContent;
  return (
    <div>
      <p className="text-sm font-medium text-ink">{c.question}</p>
      <div className="mt-3 space-y-1.5">
        {c.options.map((option, i) => (
          <div
            key={i}
            className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm ${
              i === c.correctIndex ? "border-success/30 bg-success-soft text-ink" : "border-border text-ink-muted"
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                i === c.correctIndex ? "bg-success text-white" : "bg-surface-sunken text-ink-faint"
              }`}
            >
              {i === c.correctIndex ? <IconCheck className="h-3 w-3" /> : String.fromCharCode(65 + i)}
            </span>
            {option}
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        <span className="font-medium text-ink">Toelichting: </span>
        {c.explanation}
      </p>
    </div>
  );
}
