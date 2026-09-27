import {
  EvidenceAnalysis,
  EvidenceRelation,
} from "../ai/evidenceAnalyzer";

import {
  AggregatedEvidence,
  AggregatedEvidenceItem,
} from "./evidenceAggregator.types";

class EvidenceAggregator {
  aggregate(
    evidenceItems: EvidenceAnalysis[]
  ): AggregatedEvidence {
    const supportingEvidence: AggregatedEvidenceItem[] = [];
    const contradictingEvidence: AggregatedEvidenceItem[] = [];
    const contextualEvidence: AggregatedEvidenceItem[] = [];

    let irrelevantCount = 0;

    for (const evidence of evidenceItems) {
      switch (evidence.relation) {
        case "SUPPORTS":
          supportingEvidence.push({
            relation: evidence.relation,
            directness: evidence.directness,
            explanation: evidence.explanation,
          });
          break;

        case "CONTRADICTS":
          contradictingEvidence.push({
            relation: evidence.relation,
            directness: evidence.directness,
            explanation: evidence.explanation,
          });
          break;

        case "CONTEXT_ONLY":
          contextualEvidence.push({
            relation: evidence.relation,
            directness: evidence.directness,
            explanation: evidence.explanation,
          });
          break;

        case "IRRELEVANT":
          irrelevantCount++;
          break;
      }
    }

    const hasDirectSupport = supportingEvidence.some(
      (evidence) => evidence.directness === "DIRECT"
    );

    const hasDirectContradiction = contradictingEvidence.some(
      (evidence) => evidence.directness === "DIRECT"
    );

    const hasConflictingEvidence =
      hasDirectSupport && hasDirectContradiction;

    return {
      supportingEvidence,
      contradictingEvidence,
      contextualEvidence,

      supportCount: supportingEvidence.length,
      contradictionCount: contradictingEvidence.length,
      contextCount: contextualEvidence.length,
      irrelevantCount,

      hasDirectSupport,
      hasDirectContradiction,

      hasConflictingEvidence,
    };
  }
}

export const evidenceAggregator =
  new EvidenceAggregator();