export type SourceType = "nieuwsartikel" | "overheidspublicatie" | "encyclopedisch" | "redactionele-notitie";
export type LicenseStatus = "vrij-te-gebruiken-als-input" | "parafraseren-toegestaan" | "niet-toegestaan";
export type TrustLevel = "hoog" | "middel" | "laag";

export interface SourceSummary {
  id: string;
  title: string;
  type: SourceType;
  publicationDate: string;
  trustLevel: TrustLevel;
  licenseStatus: LicenseStatus;
  expiresAt?: string;
  status: "actief" | "verlopen";
  chunkCount: number;
}

export type OpdrachtType = "digest-artifact" | "trivia" | "quiz";

export interface DigestArtifactContent {
  title: string;
  oneSentenceSummary: string;
  body: string;
}

export interface TriviaContent {
  title: string;
  fact: string;
}

export interface QuizContent {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type GeneratedContent = DigestArtifactContent | TriviaContent | QuizContent;

export type ReviewStatus = "pending_review" | "approved" | "approved_edited" | "rejected";

export interface Citation {
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  text: string;
}

export interface GeneratedItem {
  id: string;
  opdrachtType: OpdrachtType;
  topic: string;
  promptVersion: string;
  model: string;
  generatedAt: string;
  retrievedChunkIds: string[];
  citations: Citation[];
  content: GeneratedContent;
  status: ReviewStatus;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface Stats {
  total: number;
  counts: Record<ReviewStatus, number>;
  cleanApprovalRate: number | null;
}
