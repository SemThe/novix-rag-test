import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { api, ApiError } from "../api/client";
import type { SourceSummary } from "../api/types";
import { licenseStatusLabel, sourceTypeLabel, trustLevelLabel } from "../lib/format";
import { Button } from "./Button";
import { Field, Select, TextInput } from "./Field";
import { IconFile, IconUpload } from "./icons";
import { useToast } from "./Toast";

const ACCEPTED = [".txt", ".md", ".pdf"];

export function UploadSourceForm({ onCreated }: { onCreated: (source: SourceSummary) => void }) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("nieuwsartikel");
  const [publicationDate, setPublicationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [trustLevel, setTrustLevel] = useState("middel");
  const [licenseStatus, setLicenseStatus] = useState("parafraseren-toegestaan");
  const [expiresAt, setExpiresAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function pickFile(f: File | undefined) {
    if (!f) return;
    const ok = ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext));
    if (!ok) {
      toast.error("Alleen .txt, .md en .pdf bestanden worden ondersteund.");
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Kies eerst een bestand.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title);
      form.append("type", type);
      form.append("publicationDate", publicationDate);
      form.append("trustLevel", trustLevel);
      form.append("licenseStatus", licenseStatus);
      if (expiresAt) form.append("expiresAt", expiresAt);

      const source = await api.uploadSource(form);
      toast.success(`Bron "${source.title}" toegevoegd en geïndexeerd.`);
      onCreated(source);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Uploaden mislukt.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors ${
          dragOver ? "border-brand bg-brand-soft" : "border-border-strong hover:border-brand/50 hover:bg-surface-sunken"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
        {file ? (
          <>
            <IconFile className="h-6 w-6 text-brand" />
            <p className="text-sm font-medium text-ink">{file.name}</p>
            <p className="text-xs text-ink-faint">{(file.size / 1024).toFixed(0)} KB — klik om te wijzigen</p>
          </>
        ) : (
          <>
            <IconUpload className="h-6 w-6 text-ink-faint" />
            <p className="text-sm font-medium text-ink">Sleep een bestand hierheen of klik om te kiezen</p>
            <p className="text-xs text-ink-faint">.txt, .md of .pdf — max 10 MB</p>
          </>
        )}
      </div>

      <Field label="Titel" required>
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel van de bron" required />
      </Field>

      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <Field label="Brontype" required>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(sourceTypeLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Publicatiedatum" required>
          <TextInput type="date" value={publicationDate} onChange={(e) => setPublicationDate(e.target.value)} required />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
        <Field label="Betrouwbaarheid" required>
          <Select value={trustLevel} onChange={(e) => setTrustLevel(e.target.value)}>
            {Object.entries(trustLevelLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Vervaldatum" hint="Optioneel, voor actualiteitsgevoelige content">
          <TextInput type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </Field>
      </div>

      <Field label="Licentiestatus" required hint="Mag deze bron als input voor gegenereerde content gebruikt worden?">
        <Select value={licenseStatus} onChange={(e) => setLicenseStatus(e.target.value)}>
          {Object.entries(licenseStatusLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Button type="submit" variant="primary" loading={submitting} className="w-full">
        Bron toevoegen en indexeren
      </Button>
    </form>
  );
}
