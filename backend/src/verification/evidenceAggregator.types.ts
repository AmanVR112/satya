import {
  EvidenceRelation,
  EvidenceAnalysis,
} from "../ai/evidenceAnalyzer";

import {
  CoverageLevel,
  ClaimCoverage,
} from "../ai/claimCoverageAnalyzer";

export type TemporalState =
  | "PLANNED"
  | "SCHEDULED"
  | "EXPECTED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "CALLED_OFF"
  | "DEFERRED"
  | "POSTPONED"
  | "UNKNOWN";

export type EvidenceAnalysisWithCoverage =
  EvidenceAnalysis & {
    coverage: ClaimCoverage["coverage"];

    supportedParts:
    ClaimCoverage["supportedParts"];

    unsupportedParts:
    ClaimCoverage["unsupportedParts"];

    coverageExplanation:
    ClaimCoverage["explanation"];

    temporalState:
    | "PLANNED"
    | "SCHEDULED"
    | "EXPECTED"
    | "ONGOING"
    | "COMPLETED"
    | "CANCELLED"
    | "CALLED_OFF"
    | "DEFERRED"
    | "POSTPONED"
    | "UNKNOWN";

    temporalChangesClaimState: boolean;

    temporalExplanation: string;

    publishedAt?: string;
  };

export interface AggregatedEvidenceItem {
  relation: EvidenceRelation;

  directness:
  | "DIRECT"
  | "INDIRECT"
  | "NONE";

  explanation: string;

  coverage: CoverageLevel;

  supportedParts: string[];

  unsupportedParts: string[];

  coverageExplanation: string;

  temporalState:
  | "PLANNED"
  | "SCHEDULED"
  | "EXPECTED"
  | "ONGOING"
  | "COMPLETED"
  | "CANCELLED"
  | "CALLED_OFF"
  | "DEFERRED"
  | "POSTPONED"
  | "UNKNOWN";

  temporalChangesClaimState: boolean;

  temporalExplanation: string;

  publishedAt?: string;
}

export interface AggregatedEvidence {
  supportingEvidence:
  AggregatedEvidenceItem[];

  contradictingEvidence:
  AggregatedEvidenceItem[];

  contextualEvidence:
  AggregatedEvidenceItem[];

  supportCount: number;

  contradictionCount: number;

  contextCount: number;

  irrelevantCount: number;

  fullCoverageCount: number;

  partialCoverageCount: number;

  noCoverageCount: number;

  hasFullCoverage: boolean;

  hasPartialCoverage: boolean;

  hasMeaningfulCoverage: boolean;

  hasDirectSupport: boolean;

  hasDirectContradiction: boolean;

  hasConflictingEvidence: boolean;
}