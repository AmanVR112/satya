import { AggregatedEvidence } from "./evidenceAggregator.types";
import { ClaimEvidenceComparison } from "./claimEvidenceComparator.types";

export type Assessment =
  | "SUPPORTED"
  | "CONTRADICTED"
  | "MISLEADING"
  | "UNVERIFIED";

export interface AssessmentResult {
  assessment: Assessment;
  explanation: string;
}

export interface AssessmentInput {
  evidence: AggregatedEvidence;
  comparisons: ClaimEvidenceComparison[];
}