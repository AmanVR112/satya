import {
  AggregatedEvidence,
  AggregatedEvidenceItem,
  EvidenceAnalysisWithCoverage,
} from "./evidenceAggregator.types";

class EvidenceAggregator {
  aggregate(
    evidenceItems: EvidenceAnalysisWithCoverage[]
  ): AggregatedEvidence {
    const supportingEvidence: AggregatedEvidenceItem[] = [];
    const contradictingEvidence: AggregatedEvidenceItem[] = [];
    const contextualEvidence: AggregatedEvidenceItem[] = [];

    let irrelevantCount = 0;

    let fullCoverageCount = 0;
    let partialCoverageCount = 0;
    let noCoverageCount = 0;

    for (const evidence of evidenceItems) {
      const aggregatedItem: AggregatedEvidenceItem = {
        relation: evidence.relation,

        directness:
          evidence.directness,

        explanation:
          evidence.explanation,

        coverage:
          evidence.coverage,

        supportedParts:
          evidence.supportedParts,

        unsupportedParts:
          evidence.unsupportedParts,

        coverageExplanation:
          evidence.coverageExplanation,

        temporalState:
          evidence.temporalState,

        temporalChangesClaimState:
          evidence.temporalChangesClaimState,

        temporalExplanation:
          evidence.temporalExplanation,

        publishedAt:
          evidence.publishedAt,
      };

      switch (evidence.relation) {
        case "SUPPORTS":
          if (evidence.coverage === "FULL") {
            supportingEvidence.push(
              aggregatedItem
            );
          } else {
            contextualEvidence.push({
              ...aggregatedItem,
              relation: "CONTEXT_ONLY",
              directness: "NONE",
              explanation:
                `${evidence.explanation} ` +
                `The evidence does not provide full coverage of the claim, so it is retained as contextual evidence rather than counted as meaningful support.`,
            });
          }
          break;

        case "CONTRADICTS":
          contradictingEvidence.push(
            aggregatedItem
          );
          break;

        case "CONTEXT_ONLY":
          contextualEvidence.push(
            aggregatedItem
          );
          break;

        case "IRRELEVANT":
          irrelevantCount++;
          break;
      }

      switch (evidence.coverage) {
        case "FULL":
          fullCoverageCount++;
          break;

        case "PARTIAL":
          partialCoverageCount++;
          break;

        case "NONE":
          noCoverageCount++;
          break;
      }
    }

    const hasDirectSupport =
      supportingEvidence.some(
        (evidence) =>
          evidence.directness === "DIRECT"
      );

    const hasDirectContradiction =
      contradictingEvidence.some(
        (evidence) =>
          evidence.directness === "DIRECT"
      );

    const hasConflictingEvidence =
      hasDirectSupport &&
      hasDirectContradiction;

    const hasFullCoverage =
      fullCoverageCount > 0;

    const hasPartialCoverage =
      partialCoverageCount > 0;

    const hasMeaningfulCoverage =
      hasFullCoverage ||
      hasPartialCoverage;

    return {
      supportingEvidence,

      contradictingEvidence,

      contextualEvidence,

      supportCount:
        supportingEvidence.length,

      contradictionCount:
        contradictingEvidence.length,

      contextCount:
        contextualEvidence.length,

      irrelevantCount,

      fullCoverageCount,

      partialCoverageCount,

      noCoverageCount,

      hasFullCoverage,

      hasPartialCoverage,

      hasMeaningfulCoverage,

      hasDirectSupport,

      hasDirectContradiction,

      hasConflictingEvidence,
    };
  }
}

export const evidenceAggregator =
  new EvidenceAggregator();