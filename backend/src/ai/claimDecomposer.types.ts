export interface ClaimAttributes {
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

export interface ClaimDecomposer {
  decomposeClaim(
    claim: string
  ): Promise<ClaimAttributes>;
}