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
    } = evidence;

    const hasMaterialDifference =
      comparisons.some(
        (comparison) =>
          comparison.hasMaterialDifference
      );

    /*
     * Direct support + material attribute difference
     *
     * Example:
     * Claim:    ₹5000 for every citizen
     * Evidence: ₹5000 for eligible farmers
     *
     * The underlying event may be supported,
     * but an important attribute has changed.
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
     * Direct support and direct contradiction
     * cannot be confidently resolved.
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
     * Direct support with no material difference.
     */
    if (
      hasDirectSupport &&
      !hasDirectContradiction &&
      !hasMaterialDifference
    ) {
      return {
        assessment: "SUPPORTED",
        explanation:
          "Direct evidence supports the claim and no material differences were identified.",
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
     * Only indirect evidence.
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