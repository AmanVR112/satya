export interface EvidenceAttributes {
  subject: string | null;
  action: string | null;
  object: string | null;

  amount: string | null;
  location: string | null;
  population: string | null;

  date: string | null;
  status: string | null;

  conditions: string[];
}

export interface EvidenceAttributeExtractor {
  extractAttributes(
    evidence: string
  ): Promise<EvidenceAttributes>;
}