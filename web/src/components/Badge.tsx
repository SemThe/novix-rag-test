import type { ReactNode } from "react";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-sunken text-ink-muted border-border",
  brand: "bg-brand-soft text-brand-strong border-brand/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-[oklch(0.42_0.1_75)] border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
