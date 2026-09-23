import { useState } from "react";
import type { DigestArtifactContent, GeneratedContent, GeneratedItem, QuizContent, TriviaContent } from "../api/types";
import { Button } from "./Button";
import { Field, TextInput, Textarea } from "./Field";

export function EditContentForm({
  item,
  onSave,
  onCancel,
  saving,
}: {
  item: GeneratedItem;
  onSave: (content: GeneratedContent) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  if (item.opdrachtType === "digest-artifact") return <DigestEditor item={item} onSave={onSave} onCancel={onCancel} saving={saving} />;
  if (item.opdrachtType === "trivia") return <TriviaEditor item={item} onSave={onSave} onCancel={onCancel} saving={saving} />;
  return <QuizEditor item={item} onSave={onSave} onCancel={onCancel} saving={saving} />;
}

function DigestEditor({ item, onSave, onCancel, saving }: EditorProps) {
  const c = item.content as DigestArtifactContent;
  const [title, setTitle] = useState(c.title);
  const [summary, setSummary] = useState(c.oneSentenceSummary);
  const [body, setBody] = useState(c.body);

  return (
    <div className="p-5">
      <Field label="Titel">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="In één zin">
        <TextInput value={summary} onChange={(e) => setSummary(e.target.value)} />
      </Field>
      <Field label="Tekst">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
      </Field>
      <Actions
        saving={saving}
        onCancel={onCancel}
        onSave={() => onSave({ title, oneSentenceSummary: summary, body })}
      />
    </div>
  );
}

function TriviaEditor({ item, onSave, onCancel, saving }: EditorProps) {
  const c = item.content as TriviaContent;
  const [title, setTitle] = useState(c.title);
  const [fact, setFact] = useState(c.fact);

  return (
    <div className="p-5">
      <Field label="Titel">
        <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Feit">
        <Textarea value={fact} onChange={(e) => setFact(e.target.value)} rows={3} />
      </Field>
      <Actions saving={saving} onCancel={onCancel} onSave={() => onSave({ title, fact })} />
    </div>
  );
}

function QuizEditor({ item, onSave, onCancel, saving }: EditorProps) {
  const c = item.content as QuizContent;
  const [question, setQuestion] = useState(c.question);
  const [options, setOptions] = useState([...c.options]);
  const [correctIndex, setCorrectIndex] = useState(c.correctIndex);
  const [explanation, setExplanation] = useState(c.explanation);

  return (
    <div className="p-5">
      <Field label="Vraag">
        <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} />
      </Field>
      {options.map((option, i) => (
        <Field key={i} label={`Optie ${String.fromCharCode(65 + i)}${i === correctIndex ? " (correct)" : ""}`}>
          <div className="flex gap-2">
            <TextInput
              value={option}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value;
                setOptions(next);
              }}
            />
            <button
              type="button"
              onClick={() => setCorrectIndex(i)}
              className={`shrink-0 rounded-lg border px-3 text-xs font-medium transition-colors ${
                i === correctIndex
                  ? "border-success/30 bg-success-soft text-success"
                  : "border-border-strong text-ink-faint hover:bg-surface-sunken"
              }`}
            >
              Correct
            </button>
          </div>
        </Field>
      ))}
      <Field label="Toelichting">
        <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </Field>
      <Actions saving={saving} onCancel={onCancel} onSave={() => onSave({ question, options, correctIndex, explanation })} />
    </div>
  );
}

interface EditorProps {
  item: GeneratedItem;
  onSave: (content: GeneratedContent) => void;
  onCancel: () => void;
  saving: boolean;
}

function Actions({ saving, onCancel, onSave }: { saving: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <div className="mt-2 flex gap-2">
      <Button variant="primary" onClick={onSave} loading={saving}>
        Opslaan
      </Button>
      <Button variant="ghost" onClick={onCancel}>
        Annuleren
      </Button>
    </div>
  );
}
