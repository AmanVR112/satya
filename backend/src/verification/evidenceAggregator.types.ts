import { EvidenceRelation } from "../ai/evidenceAnalyzer";

export interface AggregatedEvidenceItem {
  relation: EvidenceRelation;
  directness: "DIRECT" | "INDIRECT" | "NONE";
  explanation: string;
}

export interface AggregatedEvidence {
  supportingEvidence: AggregatedEvidenceItem[];
  contradictingEvidence: AggregatedEvidenceItem[];
  contextualEvidence: AggregatedEvidenceItem[];

  supportCount: number;
  contradictionCount: number;
  contextCount: number;
  irrelevantCount: number;

  hasDirectSupport: boolean;
  hasDirectContradiction: boolean;

  hasConflictingEvidence: boolean;
}