import { useEffect, useState } from "react";
import { api, ApiError } from "../api/client";
import type { GeneratedItem, OpdrachtType, SourceSummary } from "../api/types";
import { Button } from "../components/Button";
import { Field, Select, TextInput, Textarea } from "../components/Field";
import { IconAlert, IconChevronDown, IconDigest, IconQuiz, IconSparkles, IconTrivia } from "../components/icons";
import { useToast } from "../components/Toast";
import { sourceTypeLabel } from "../lib/format";
import { GeneratedContentView } from "../components/GeneratedContentView";

const opdrachten: { type: OpdrachtType; label: string; icon: typeof IconDigest; hint: string }[] = [
  { type: "digest-artifact", label: "Digest-artifact", icon: IconDigest, hint: "Kort uitlegstuk + samenvatting" },
  { type: "trivia", label: "Trivia", icon: IconTrivia, hint: "Één los feit" },
  { type: "quiz", label: "Quiz", icon: IconQuiz, hint: "Meerkeuzevraag" },
];

export function Generate() {
  const toast = useToast();
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [opdrachtType, setOpdrachtType] = useState<OpdrachtType>("digest-artifact");
  const [prompt, setPrompt] = useState("");
  const [instructions, setInstructions] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [since, setSince] = useState("");
  const [provider, setProvider] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedItem | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    api.listSources().then(setSources);
  }, []);

  const activeSourceCount = sources.filter((s) => s.status === "actief").length;

  async function onSubmit() {
    if (!prompt.trim()) {
      toast.error("Vul een onderwerp of opdracht in.");
      return;
    }
    setLoading(true);
    setResult(null);
    setRefusal(null);
    try {
      const item = await api.generate({
        opdrachtType,
        prompt: prompt.trim(),
        instructions: instructions.trim() || undefined,
        sourceType: sourceType || undefined,
        since: since || undefined,
        provider: provider || undefined,
      });
      setResult(item);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message.toLowerCase().includes("geweigerd")) {
          setRefusal(err.message);
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error("Genereren mislukt.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function onDecision(decision: "approve" | "reject") {
    if (!result) return;
    try {
      if (decision === "approve") {
        const updated = await api.approve(result.id, false);
        setResult(updated);
        toast.success("Goedgekeurd.");
      } else {
        const reason = window.prompt("Reden voor afwijzing:");
        if (!reason) return;
        const updated = await api.reject(result.id, reason);
        setResult(updated);
        toast.success("Afgewezen.");
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Actie mislukt.");
    }
  }

  return (
    <div className="animate-fade-up">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Content genereren</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Gegrond in retrieval — het systeem genereert nooit zonder brongrondslag, en niets gaat automatisch
          live.
        </p>
      </header>

      {activeSourceCount === 0 && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 text-sm">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-[oklch(0.5_0.13_75)]" />
          <p className="text-ink">
            Er zijn nog geen actieve bronnen. Voeg eerst een bron toe op de{" "}
            <a href="/bronnen" className="font-medium underline underline-offset-2">
              bronnenpagina
            </a>
            .
          </p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          {opdrachten.map(({ type, label, icon: Icon, hint }) => (
            <button
              key={type}
              onClick={() => setOpdrachtType(type)}
              className={`flex flex-1 flex-col items-start gap-1 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                opdrachtType === type
                  ? "border-brand bg-brand-soft"
                  : "border-border-strong bg-surface hover:bg-surface-sunken"
              }`}
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                <Icon className={`h-4 w-4 ${opdrachtType === type ? "text-brand" : "text-ink-faint"}`} />
                {label}
              </span>
              <span className="text-xs text-ink-faint">{hint}</span>
            </button>
          ))}
        </div>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Waarover wil je content genereren? Bv. "het nieuwe pensioenstelsel" of "maak een lastige vraag over de AOW-leeftijd"'
          rows={3}
          className="mb-1"
        />
        <p className="mb-4 text-xs text-ink-faint">
          Dit onderwerp wordt gebruikt om relevante bronfragmenten op te halen én als opdracht voor het model.
        </p>

        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className="mb-3 flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
        >
          <IconChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${advancedOpen ? "rotate-180" : ""}`} />
          Geavanceerd
        </button>

        {advancedOpen && (
          <div className="mb-4 grid grid-cols-1 gap-x-3 rounded-lg bg-surface-sunken p-3.5 sm:grid-cols-2">
            <div className="col-span-2">
              <Field label="Extra instructies" hint="Vrije tekst, bv. 'maak het moeilijker' of 'focus op jaartallen'">
                <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} />
              </Field>
            </div>
            <Field label="Filter op brontype">
              <Select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
                <option value="">Alle brontypen</option>
                {Object.entries(sourceTypeLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Alleen bronnen sinds">
              <TextInput type="date" value={since} onChange={(e) => setSince(e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label="Generatie-provider" hint="Standaard: wat in .env staat (GENERATION_PROVIDER)">
                <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
                  <option value="">Standaard</option>
                  <option value="claude">Claude</option>
                  <option value="ollama">Ollama (lokaal)</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        <Button variant="primary" onClick={onSubmit} loading={loading} className="w-full">
          <IconSparkles className="h-4 w-4" />
          Genereren
        </Button>
      </div>

      {refusal && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning-soft px-5 py-4">
          <IconAlert className="mt-0.5 h-5 w-5 shrink-0 text-[oklch(0.5_0.13_75)]" />
          <div>
            <p className="text-sm font-medium text-ink">Generatie geweigerd</p>
            <p className="mt-1 text-sm text-ink-muted">{refusal}</p>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5 animate-fade-up rounded-xl border border-border bg-surface shadow-card">
          <GeneratedContentView item={result} />
          {result.status === "pending_review" && (
            <div className="flex gap-2 border-t border-border px-5 py-4">
              <Button variant="primary" onClick={() => onDecision("approve")}>
                Goedkeuren
              </Button>
              <Button variant="danger" onClick={() => onDecision("reject")}>
                Afwijzen
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
