import { ClaimAttributes } from "../ai/claimDecomposer.types";
import { EvidenceAttributes } from "../ai/evidenceAttributeExtractor.types";

export type ComparisonField =
  | "subject"
  | "action"
  | "object"
  | "amount"
  | "location"
  | "population"
  | "date"
  | "status"
  | "conditions";

export type DifferenceSignificance =
  | "LOW"
  | "MEDIUM"
  | "HIGH";

export interface AttributeDifference {
  field: ComparisonField;
  claimValue: string | null;
  evidenceValue: string | null;
  significance: DifferenceSignificance;
}

export interface ClaimEvidenceComparison {
  hasMaterialDifference: boolean;
  differences: AttributeDifference[];
}

export interface ClaimEvidenceComparator {
  compare(
    claim: ClaimAttributes,
    evidence: EvidenceAttributes
  ): ClaimEvidenceComparison;
}