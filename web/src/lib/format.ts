import type { OpdrachtType, ReviewStatus, SourceType, TrustLevel, LicenseStatus } from "../api/types";

export const statusLabel: Record<ReviewStatus, string> = {
  pending_review: "Wacht op review",
  approved: "Goedgekeurd",
  approved_edited: "Goedgekeurd (bewerkt)",
  rejected: "Afgewezen",
};

export const statusTone: Record<ReviewStatus, "warning" | "success" | "danger"> = {
  pending_review: "warning",
  approved: "success",
  approved_edited: "success",
  rejected: "danger",
};

export const opdrachtLabel: Record<OpdrachtType, string> = {
  "digest-artifact": "Digest-artifact",
  trivia: "Trivia",
  quiz: "Quiz",
};

export const sourceTypeLabel: Record<SourceType, string> = {
  nieuwsartikel: "Nieuwsartikel",
  overheidspublicatie: "Overheidspublicatie",
  encyclopedisch: "Encyclopedisch",
  "redactionele-notitie": "Redactionele notitie",
};

export const trustLevelLabel: Record<TrustLevel, string> = {
  hoog: "Hoog",
  middel: "Middel",
  laag: "Laag",
};

export const licenseStatusLabel: Record<LicenseStatus, string> = {
  "vrij-te-gebruiken-als-input": "Vrij te gebruiken als input",
  "parafraseren-toegestaan": "Parafraseren toegestaan",
  "niet-toegestaan": "Niet toegestaan als input",
};

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}
