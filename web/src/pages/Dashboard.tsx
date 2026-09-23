import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { GeneratedItem, SourceSummary, Stats } from "../api/types";
import { Badge } from "../components/Badge";
import { IconDigest, IconInbox, IconLibrary, IconQuiz, IconSparkles, IconTrivia } from "../components/icons";
import { statusTone, statusLabel, opdrachtLabel } from "../lib/format";

const opdrachtIcon = { "digest-artifact": IconDigest, trivia: IconTrivia, quiz: IconQuiz };

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [recent, setRecent] = useState<GeneratedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getStats(), api.listSources(), api.listGenerated("all")])
      .then(([s, src, gen]) => {
        setStats(s);
        setSources(src);
        setRecent(gen.slice().reverse().slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  const activeSources = sources.filter((s) => s.status === "actief").length;
  const pending = stats?.counts.pending_review ?? 0;
  const approvalPct = stats?.cleanApprovalRate != null ? Math.round(stats.cleanApprovalRate * 100) : null;

  return (
    <div className="animate-fade-up">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-muted">Overzicht van bronnen, generatie en redactionele review.</p>
      </header>

      <section className="mb-8 rounded-xl border border-border bg-surface shadow-card">
        <div className="grid grid-cols-2 divide-x divide-border sm:grid-cols-4">
          <Stat label="Actieve bronnen" value={loading ? "–" : activeSources} />
          <Stat label="Totaal gegenereerd" value={loading ? "–" : (stats?.total ?? 0)} />
          <Stat label="Wacht op review" value={loading ? "–" : pending} emphasize={pending > 0} />
          <Stat
            label="Ongewijzigd goedgekeurd"
            value={loading || approvalPct === null ? "–" : `${approvalPct}%`}
          />
        </div>
      </section>

      <div className="mb-8 flex flex-wrap gap-3">
        <QuickAction to="/bronnen" icon={IconLibrary} label="Bron toevoegen" />
        <QuickAction to="/genereren" icon={IconSparkles} label="Content genereren" />
        <QuickAction to="/review" icon={IconInbox} label="Reviewwachtrij" badge={pending || undefined} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-muted">Recent gegenereerd</h2>
        {loading ? (
          <p className="text-sm text-ink-faint">Laden…</p>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong px-6 py-10 text-center">
            <p className="text-sm text-ink-muted">Nog niets gegenereerd. Ga naar Genereren om te beginnen.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
            {recent.map((item, i) => {
              const Icon = opdrachtIcon[item.opdrachtType];
              return (
                <Link
                  key={item.id}
                  to="/review"
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-sunken ${
                    i !== 0 ? "border-t border-border" : ""
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-ink-faint" />
                  <span className="min-w-0 flex-1 truncate text-ink">{item.topic}</span>
                  <span className="hidden shrink-0 text-xs text-ink-faint sm:inline">{opdrachtLabel[item.opdrachtType]}</span>
                  <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, emphasize }: { label: string; value: string | number; emphasize?: boolean }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-[-0.02em] ${emphasize ? "text-brand" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  badge,
}: {
  to: string;
  icon: typeof IconLibrary;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2.5 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink shadow-card transition-colors hover:border-brand/40 hover:bg-brand-soft"
    >
      <Icon className="h-4 w-4 text-brand" />
      {label}
      {badge ? (
        <span className="ml-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
