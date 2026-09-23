import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { SourceSummary } from "../api/types";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { IconLibrary, IconTrash, IconUpload } from "../components/icons";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { UploadSourceForm } from "../components/UploadSourceForm";
import { formatDate, licenseStatusLabel, sourceTypeLabel, trustLevelLabel } from "../lib/format";

export function Sources() {
  const toast = useToast();
  const [sources, setSources] = useState<SourceSummary[] | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refresh() {
    api.listSources().then(setSources);
  }

  useEffect(refresh, []);

  async function onDelete(source: SourceSummary) {
    if (!window.confirm(`"${source.title}" verwijderen? Dit verwijdert ook de bijbehorende fragmenten uit de vectordatabase.`)) {
      return;
    }
    setDeletingId(source.id);
    try {
      await api.deleteSource(source.id);
      toast.success(`Bron "${source.title}" verwijderd.`);
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Verwijderen mislukt.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="animate-fade-up">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em]">Bronnenbibliotheek</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Upload documenten om te feeden aan het RAG-systeem. Elke bron krijgt metadata en wordt automatisch
            gechunkt en geëmbed.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowUpload(true)}>
          <IconUpload className="h-4 w-4" />
          Bron toevoegen
        </Button>
      </header>

      {sources === null ? (
        <p className="text-sm text-ink-faint">Laden…</p>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong px-6 py-16 text-center">
          <IconLibrary className="h-8 w-8 text-ink-faint" />
          <p className="text-sm font-medium text-ink">Nog geen bronnen</p>
          <p className="max-w-sm text-sm text-ink-muted">
            Voeg je eerste bron toe — een nieuwsartikel, overheidspublicatie of encyclopedisch stuk — om
            content te kunnen genereren.
          </p>
          <Button variant="primary" onClick={() => setShowUpload(true)} className="mt-2">
            <IconUpload className="h-4 w-4" />
            Bron toevoegen
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-card">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-ink-faint">
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Publicatie</th>
                <th className="px-4 py-3 font-medium">Betrouwbaarheid</th>
                <th className="px-4 py-3 font-medium">Licentie</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Fragmenten</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={s.id} className={i !== 0 ? "border-t border-border" : ""}>
                  <td className="max-w-[220px] truncate px-4 py-3 font-medium text-ink" title={s.title}>
                    {s.title}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{sourceTypeLabel[s.type]}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{formatDate(s.publicationDate)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{trustLevelLabel[s.trustLevel]}</td>
                  <td className="max-w-[180px] truncate px-4 py-3 text-ink-muted" title={licenseStatusLabel[s.licenseStatus]}>
                    {licenseStatusLabel[s.licenseStatus]}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge tone={s.status === "actief" ? "success" : "danger"}>
                      {s.status === "actief" ? "Actief" : "Verlopen"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{s.chunkCount}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button
                      onClick={() => onDelete(s)}
                      disabled={deletingId === s.id}
                      className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger disabled:opacity-50"
                      aria-label={`${s.title} verwijderen`}
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && (
        <Modal title="Bron toevoegen" onClose={() => setShowUpload(false)}>
          <UploadSourceForm
            onCreated={() => {
              setShowUpload(false);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
