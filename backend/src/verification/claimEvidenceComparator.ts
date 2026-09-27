import {
  ClaimAttributes,
} from "../ai/claimDecomposer.types";

import {
  EvidenceAttributes,
} from "../ai/evidenceAttributeExtractor.types";

import {
  AttributeDifference,
  ClaimEvidenceComparator,
  ClaimEvidenceComparison,
  ComparisonField,
  DifferenceSignificance,
} from "./claimEvidenceComparator.types";

class ClaimEvidenceComparatorImpl
  implements ClaimEvidenceComparator {
  compare(
    claim: ClaimAttributes,
    evidence: EvidenceAttributes
  ): ClaimEvidenceComparison {
    const differences: AttributeDifference[] = [];

    this.compareSubject(
      claim.subject,
      evidence.subject,
      differences
    );

    this.compareAction(
      claim.action,
      evidence.action,
      differences
    );

    this.compareObject(
      claim.object,
      evidence.object,
      differences
    );

    this.compareAmount(
      claim.amount,
      evidence.amount,
      differences
    );

    this.compareLocation(
      claim.location,
      evidence.location,
      differences
    );

    this.comparePopulation(
      claim.population,
      evidence.population,
      differences
    );

    this.compareField(
      "date",
      claim.date,
      evidence.date,
      "MEDIUM",
      differences
    );

    this.compareField(
      "status",
      claim.status,
      evidence.status,
      "HIGH",
      differences
    );

    this.compareConditions(
      claim.conditions,
      evidence.conditions,
      differences
    );

    return {
      hasMaterialDifference: differences.some(
        (difference) =>
          difference.significance === "HIGH"
      ),
      differences,
    };
  }

  private compareSubject(
    claimValue: string | null,
    evidenceValue: string | null,
    differences: AttributeDifference[]
  ): void {
    if (
      claimValue === null ||
      evidenceValue === null
    ) {
      return;
    }

    if (
      this.normalizeEntity(claimValue) ===
      this.normalizeEntity(evidenceValue)
    ) {
      return;
    }

    differences.push({
      field: "subject",
      claimValue,
      evidenceValue,
      significance: "HIGH",
    });
  }

  private compareAction(
    claimValue: string | null,
    evidenceValue: string | null,
    differences: AttributeDifference[]
  ): void {
    if (
      claimValue === null ||
      evidenceValue === null
    ) {
      return;
    }

    if (
      this.normalizeAction(claimValue) ===
      this.normalizeAction(evidenceValue)
    ) {
      return;
    }

    differences.push({
      field: "action",
      claimValue,
      evidenceValue,
      significance: "MEDIUM",
    });
  }

  private compareObject(
    claimValue: string | null,
    evidenceValue: string | null,
    differences: AttributeDifference[]
  ): void {
    if (
      claimValue === null ||
      evidenceValue === null
    ) {
      return;
    }

    const claimNormalized =
      this.normalize(claimValue);

    const evidenceNormalized =
      this.normalize(evidenceValue);

    if (claimNormalized === evidenceNormalized) {
      return;
    }

    /*
     * If the objects differ only because one
     * contains a more specific description,
     * don't immediately classify it as a
     * material difference.
     *
     * Numerical differences are handled separately
     * by compareAmount().
     */
    if (
      this.isMoreSpecificDescription(
        claimNormalized,
        evidenceNormalized
      )
    ) {
      return;
    }

    differences.push({
      field: "object",
      claimValue,
      evidenceValue,
      significance: "HIGH",
    });
  }

  private compareAmount(
    claimValue: string | null,
    evidenceValue: string | null,
    differences: AttributeDifference[]
  ): void {
    if (
      claimValue === null ||
      evidenceValue === null
    ) {
      return;
    }

    if (
      this.normalize(claimValue) ===
      this.normalize(evidenceValue)
    ) {
      return;
    }

    differences.push({
      field: "amount",
      claimValue,
      evidenceValue,
      significance: "HIGH",
    });
  }

  private compareLocation(
    claimValue: string | null,
    evidenceValue: string | null,
    differences: AttributeDifference[]
  ): void {
    if (
      claimValue === null ||
      evidenceValue === null
    ) {
      return;
    }

    const claimLocation =
      this.normalizeLocation(claimValue);

    const evidenceLocation =
      this.normalizeLocation(evidenceValue);

    // Exact match
    if (
      claimLocation === evidenceLocation
    ) {
      return;
    }

    /*
     * A more specific location is compatible
     * with a broader claimed location.
     *
     * Examples:
     *
     * Paris, France
     * → 7th arrondissement, Paris, France
     *
     * Paris, France
     * → Champ de Mars, Paris, France
     *
     * Paris, France
     * → 5 Avenue Anatole France, Paris, France
     */

    if (
      this.isLocationCompatible(
        claimLocation,
        evidenceLocation
      )
    ) {
      return;
    }

    differences.push({
      field: "location",
      claimValue,
      evidenceValue,
      significance: "HIGH",
    });
  }

  private isLocationCompatible(
    claimLocation: string,
    evidenceLocation: string
  ): boolean {
    const claimParts =
      this.getLocationParts(claimLocation);

    const evidenceParts =
      this.getLocationParts(evidenceLocation);

    /*
     * If every meaningful part of the broader
     * claim location appears in the evidence
     * location, treat the evidence as compatible.
     *
     * Example:
     *
     * claim:
     *   paris france
     *
     * evidence:
     *   champ de mars paris france
     *
     * Shared meaningful parts:
     *   paris
     *   france
     *
     * Therefore:
     *   compatible = true
     */

    if (
      claimParts.length === 0 ||
      evidenceParts.length === 0
    ) {
      return false;
    }

    return claimParts.every(
      (part) =>
        evidenceParts.includes(part)
    );
  }

  private getLocationParts(
  value: string
): string[] {
  return value
    .split(",")
    .map((part) =>
      part.trim().toLowerCase()
    )
    .filter(
      (part) => part.length > 0
    );
}

  private comparePopulation(
    claimValue: string | null,
    evidenceValue: string | null,
    differences: AttributeDifference[]
  ): void {
    if (
      claimValue === null ||
      evidenceValue === null
    ) {
      return;
    }

    if (
      this.normalize(claimValue) ===
      this.normalize(evidenceValue)
    ) {
      return;
    }

    differences.push({
      field: "population",
      claimValue,
      evidenceValue,
      significance: "HIGH",
    });
  }

  private compareField(
    field: ComparisonField,
    claimValue: string | null,
    evidenceValue: string | null,
    significance: DifferenceSignificance,
    differences: AttributeDifference[]
  ): void {
    if (
      claimValue === null ||
      evidenceValue === null
    ) {
      return;
    }

    if (
      this.normalize(claimValue) ===
      this.normalize(evidenceValue)
    ) {
      return;
    }

    differences.push({
      field,
      claimValue,
      evidenceValue,
      significance,
    });
  }

  private compareConditions(
    claimConditions: string[],
    evidenceConditions: string[],
    differences: AttributeDifference[]
  ): void {
    if (
      claimConditions.length === 0 ||
      evidenceConditions.length === 0
    ) {
      return;
    }

    const claimText =
      claimConditions.join("; ");

    const evidenceText =
      evidenceConditions.join("; ");

    if (
      this.normalize(claimText) ===
      this.normalize(evidenceText)
    ) {
      return;
    }

    differences.push({
      field: "conditions",
      claimValue: claimText,
      evidenceValue: evidenceText,
      significance: "HIGH",
    });
  }

  private normalize(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  private normalizeEntity(
    value: string
  ): string {
    return this.normalize(value)
      .replace(/^the\s+/, "")
      .replace(/^a\s+/, "")
      .replace(/^an\s+/, "");
  }

  private normalizeAction(
    value: string
  ): string {
    return this.normalize(value)
      .replace(/^is\s+/, "")
      .replace(/^was\s+/, "")
      .replace(/\s+in$/, "")
      .replace(/\s+to$/, "");
  }

  private normalizeLocation(
    value: string
  ): string {
    return this.normalize(value)
      .replace(/\s+/g, " ");
  }

  private isMoreSpecificDescription(
    claimValue: string,
    evidenceValue: string
  ): boolean {
    return (
      evidenceValue.includes(claimValue) ||
      claimValue.includes(evidenceValue)
    );
  }
}

export const claimEvidenceComparator =
  new ClaimEvidenceComparatorImpl();