export type SourceType = "nieuwsartikel" | "overheidspublicatie" | "encyclopedisch" | "redactionele-notitie";

export type LicenseStatus = "vrij-te-gebruiken-als-input" | "parafraseren-toegestaan" | "niet-toegestaan";

export interface SourceMetadata {
  id: string;
  title: string;
  type: SourceType;
  publicationDate: string;
  trustLevel: "hoog" | "middel" | "laag";
  licenseStatus: LicenseStatus;
  expiresAt?: string;
}

export interface Chunk {
  id: string;
  sourceId: string;
  sourceTitle: string;
  sourceType: SourceType;
  publicationDate: string;
  trustLevel: SourceMetadata["trustLevel"];
  licenseStatus: LicenseStatus;
  expiresAt?: string;
  text: string;
  embedding: number[];
}

export interface RetrievedChunk extends Chunk {
  score: number;
}

export type OpdrachtType = "digest-artifact";

export type ReviewStatus = "pending_review" | "approved" | "approved_edited" | "rejected";

export interface GeneratedItem {
  id: string;
  opdrachtType: OpdrachtType;
  topic: string;
  promptVersion: string;
  model: string;
  generatedAt: string;
  retrievedChunkIds: string[];
  citations: { chunkId: string; sourceId: string; sourceTitle: string }[];
  title: string;
  oneSentenceSummary: string;
  body: string;
  status: ReviewStatus;
  reviewedAt?: string;
  rejectionReason?: string;
}
