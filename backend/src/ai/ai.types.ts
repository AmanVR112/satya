export interface ExtractedClaim {
  claim: string;
  claimType: "FACTUAL" | "OPINION" | "QUESTION" | "OTHER";
  needsVerification: boolean;
}

export interface AIService {
  extractClaims(text: string): Promise<ExtractedClaim[]>;
}