import { ollamaClaimExtractor } from "./ollamaClaimExtractor";

export const aiService = {
  extractClaims: (text: string) => {
    return ollamaClaimExtractor.extractClaims(text);
  },
};