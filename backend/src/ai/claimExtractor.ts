import {
  AIService,
  ExtractedClaim,
} from "./ai.types";

class LocalClaimExtractor implements AIService {
  async extractClaims(text: string): Promise<ExtractedClaim[]> {
    const cleanedText = text.trim();

    if (!cleanedText) {
      return [];
    }

    return [
      {
        claim: cleanedText,
        claimType: "FACTUAL",
        needsVerification: true,
      },
    ];
  }
}

export const claimExtractor = new LocalClaimExtractor();