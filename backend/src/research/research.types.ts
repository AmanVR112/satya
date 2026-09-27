export type SourceType =
  | "OFFICIAL"
  | "PRIMARY"
  | "NEWS"
  | "RESEARCH"
  | "FACT_CHECK"
  | "USER_GENERATED"
  | "OTHER";

export interface ResearchSource {
  url: string;
  title?: string;
  domain?: string;
  sourceType: SourceType;
  publishedAt?: string;
}

export interface ResearchEvidence {
  source: ResearchSource;
  excerpt: string;
  relevance?: string;
  directness?: string;
  independence?: string;
}

export interface ResearchResult {
  claimId: string;
  evidence: ResearchEvidence[];
}