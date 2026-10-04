import {
  Assessment,
  AssessmentInput,
  AssessmentResult,
} from "./assessmentEngine.types";

class AssessmentEngine {
  assess({
    evidence,
    comparisons,
  }: AssessmentInput): AssessmentResult {
    const {
      hasDirectSupport,
      hasDirectContradiction,
      supportCount,
      contradictionCount,
      hasFullCoverage,
      hasPartialCoverage,
    } = evidence;

    const hasMaterialDifference =
      comparisons.some(
        (comparison) =>
          comparison.hasMaterialDifference
      );

    /*
     * Direct support + direct contradiction
     *
     * Conflicting direct evidence cannot be
     * confidently resolved.
     */
    if (
      hasDirectSupport &&
      hasDirectContradiction
    ) {
      return {
        assessment: "UNVERIFIED",
        explanation:
          "The available evidence contains direct support and direct contradiction, so the claim cannot be confidently resolved.",
      };
    }

    /*
     * Direct support + material difference
     *
     * The evidence supports part of the claim,
     * but an important attribute differs.
     */
    if (
      hasDirectSupport &&
      !hasDirectContradiction &&
      hasMaterialDifference
    ) {
      return {
        assessment: "MISLEADING",
        explanation:
          "The available evidence supports the underlying claim but differs on one or more material attributes.",
      };
    }

    /*
     * Direct support + partial coverage
     *
     * The evidence supports some important parts
     * of the claim, but does not establish the
     * complete claim.
     */
    if (
      hasDirectSupport &&
      !hasDirectContradiction &&
      hasPartialCoverage &&
      !hasFullCoverage
    ) {
      return {
        assessment: "MISLEADING",
        explanation:
          "The available evidence supports important parts of the claim, but does not establish the claim in its entirety.",
      };
    }

    /*
 * Support + full coverage.
 *
 * The evidence may establish the complete claim
 * either directly or through valid indirect logical
 * entailment. Direct wording is not required when
 * the coverage analyzer confirms that the important
 * factual components are fully established.
 */
    if (
      supportCount > 0 &&
      !hasDirectContradiction &&
      hasFullCoverage
    ) {
      return {
        assessment: "SUPPORTED",
        explanation:
          hasDirectSupport
            ? "Direct evidence supports the complete claim."
            : "The available evidence logically establishes the complete claim.",
      };
    }

    /*
     * Direct contradiction.
     */
    if (
      hasDirectContradiction &&
      !hasDirectSupport
    ) {
      return {
        assessment: "CONTRADICTED",
        explanation:
          "Direct evidence contradicts the claim and no direct supporting evidence was identified.",
      };
    }

    /*
     * Direct support exists, but coverage is NONE.
     *
     * This means the evidence is related enough
     * to be classified as supporting evidence,
     * but the coverage analyzer could not establish
     * any important part of the actual claim.
     */
    if (
      hasDirectSupport &&
      !hasDirectContradiction &&
      !hasPartialCoverage &&
      !hasFullCoverage
    ) {
      return {
        assessment: "UNVERIFIED",
        explanation:
          "The available evidence is related to the claim but does not establish any important part of the claim.",
      };
    }

    /*
     * No direct support or contradiction.
     */
    if (
      supportCount === 0 &&
      contradictionCount === 0
    ) {
      return {
        assessment: "UNVERIFIED",
        explanation:
          "The available evidence does not provide sufficient direct support or contradiction for the claim.",
      };
    }

    /*
     * Only indirect evidence or unresolved evidence.
     */
    return {
      assessment: "UNVERIFIED",
      explanation:
        "The available evidence is indirect and is not sufficient to make a stronger assessment.",
    };
  }
}

export const assessmentEngine =
  new AssessmentEngine();