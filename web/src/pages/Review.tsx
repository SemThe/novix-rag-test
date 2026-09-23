import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { GeneratedContent, GeneratedItem } from "../api/types";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { EditContentForm } from "../components/EditContentForm";
import { GeneratedContentView } from "../components/GeneratedContentView";
import { IconDigest, IconInbox, IconQuiz, IconTrivia } from "../components/icons";
import { useToast } from "../components/Toast";
import { opdrachtLabel, statusLabel, statusTone } from "../lib/format";

const opdrachtIcon = { "digest-artifact": IconDigest, trivia: IconTrivia, quiz: IconQuiz };
type Filter = "pending_review" | "all";

export function Review() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("pending_review");
  const [items, setItems] = useState<GeneratedItem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [wasEdited, setWasEdited] = useState(false);

  function refresh(keepSelection = true) {
    api.listGenerated(filter).then((list) => {
      const sorted = list.slice().reverse();
      setItems(sorted);
      if (!keepSelection || !sorted.some((i) => i.id === selectedId)) {
        setSelectedId(sorted[0]?.id ?? null);
      }
    });
  }

  useEffect(() => {
    refresh(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  function selectItem(id: string) {
    setSelectedId(id);
    setEditing(false);
    setWasEdited(false);
  }

  const selected = items?.find((i) => i.id === selectedId) ?? null;

  async function onSaveEdit(content: GeneratedContent) {
    if (!selected) return;
    setBusy(true);
    try {
      const updated = await api.updateContent(selected.id, content);
      setItems((prev) => prev?.map((i) => (i.id === updated.id ? updated : i)) ?? prev);
      setWasEdited(true);
      setEditing(false);
      toast.success("Wijzigingen opgeslagen.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Opslaan mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function onApprove() {
    if (!selected) return;
    setBusy(true);
    try {
      await api.approve(selected.id, wasEdited);
      toast.success("Goedgekeurd.");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Actie mislukt.");
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!selected) return;
    const reason = window.prompt("Reden voor afwijzing (bv. “feitelijk onjuist”, “te gevoelig”, “verouderd”):");
    if (!reason) return;
    setBusy(true);
    try {
      await api.reject(selected.id, reason);
      toast.success("Afgewezen.");
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Actie mislukt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Reviewwachtrij</h1>
          <p className="mt-1 text-sm text-ink-muted">Niets gaat live zonder redactionele goedkeuring.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border-strong bg-surface p-1">
          <FilterTab active={filter === "pending_review"} onClick={() => setFilter("pending_review")}>
            Wacht op review
          </FilterTab>
          <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
            Alle
          </FilterTab>
        </div>
      </header>

      {items === null ? (
        <p className="text-sm text-ink-faint">Laden…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
          <IconInbox className="h-8 w-8 text-ink-faint" />
          <p className="text-sm font-medium text-ink">
            {filter === "pending_review" ? "Reviewwachtrij is leeg" : "Nog niets gegenereerd"}
          </p>
          <p className="max-w-sm text-sm text-ink-muted">
            Ga naar Genereren om trivia, quizvragen of digest-artifacts te maken.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <div className="h-fit overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            {items.map((item, i) => {
              const Icon = opdrachtIcon[item.opdrachtType];
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item.id)}
                  className={`flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition-colors ${
                    i !== 0 ? "border-t border-border" : ""
                  } ${isSelected ? "bg-brand-soft" : "hover:bg-surface-sunken"}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-brand" : "text-ink-faint"}`} />
                    <span className="truncate text-sm font-medium text-ink">{item.topic}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-ink-faint">{opdrachtLabel[item.opdrachtType]}</span>
                    {filter === "all" && <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>}
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            {selected ? (
              <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
                {editing ? (
                  <EditContentForm item={selected} onSave={onSaveEdit} onCancel={() => setEditing(false)} saving={busy} />
                ) : (
                  <>
                    <GeneratedContentView item={selected} defaultSourcesOpen key={selected.id} />
                    {selected.status === "pending_review" && (
                      <div className="flex items-center gap-2 border-t border-border px-5 py-4">
                        <Button variant="primary" onClick={onApprove} disabled={busy}>
                          {wasEdited ? "Opslaan & goedkeuren" : "Goedkeuren"}
                        </Button>
                        <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
                          Bewerken
                        </Button>
                        <Button variant="danger" onClick={onReject} disabled={busy}>
                          Afwijzen
                        </Button>
                        {wasEdited && <span className="ml-auto text-xs text-ink-faint">Bewerkt — nog niet opgeslagen als goedgekeurd</span>}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-faint">Selecteer een item.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-brand text-white" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
