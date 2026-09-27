import {
  ClaimAttributes,
  ClaimDecomposer,
} from "./claimDecomposer.types";

interface OllamaResponse {
  message?: {
    content?: string;
  };
}

interface OllamaClaimAttributes {
  subject?: string | null;
  action?: string | null;
  object?: string | null;

  amount?: string | null;
  location?: string | null;
  population?: string | null;

  date?: string | null;
  status?: string | null;

  conditions?: string[];
}

class OllamaClaimDecomposer implements ClaimDecomposer {
  private readonly ollamaUrl =
    "http://localhost:11434/api/chat";

  private readonly model = "qwen3.5:4b";

  async decomposeClaim(
    claim: string
  ): Promise<ClaimAttributes> {
    const response = await fetch(
      this.ollamaUrl,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model: this.model,

          messages: [
            {
              role: "system",

              content: `
You are the claim decomposition engine for Satya.

Your job is to extract the important factual attributes
contained explicitly in ONE CLAIM.

You are NOT a fact checker.
You must NOT determine whether the claim is true or false.

Return ONLY valid JSON in this exact structure:

{
  "subject": null,
  "action": null,
  "object": null,
  "amount": null,
  "location": null,
  "population": null,
  "date": null,
  "status": null,
  "conditions": []
}

Rules:

1. Extract only information that is explicitly stated
or clearly expressed in the claim.

2. Never invent missing information.

3. If an attribute is not present, return null.

4. "subject" identifies the main person, organization,
government, group, or entity making or performing the action.

5. "action" identifies the main action or relationship
being asserted.

6. "object" identifies what the action concerns.

7. AMOUNT EXTRACTION IS REQUIRED.

Look carefully for any explicitly stated monetary amount,
number, quantity, percentage, or other important numeric value.

If the claim contains a monetary amount, you MUST extract it.

Examples:

"The government proposed a $1000 payment."
→ "amount": "$1000"

"The government announced a ₹5000 payment."
→ "amount": "₹5000"

"Users receive 20% cashback."
→ "amount": "20%"

"The fine is 10,000 rupees."
→ "amount": "10,000 rupees"

"Each citizen receives 5000 dollars."
→ "amount": "5000 dollars"

Preserve the amount and currency/unit as stated.

Do NOT convert currencies or units.

Do NOT place the amount only inside "object".
The amount must also be extracted into the "amount" field.

If no explicit amount, quantity, or percentage exists,
return null.

IMPORTANT:
"$1000 payment" MUST produce:
"amount": "$1000"

Do not omit an amount because it appears next to words such
as payment, benefit, reward, fine, salary, refund, grant,
compensation, or prize.

7a. Do not omit an explicitly stated amount merely because
the amount is attached to another phrase such as
"payment", "benefit", "reward", "fine", "salary", or "refund".

8. "location" identifies a country, city, region, or other
explicit geographic location.

9. "population" identifies the people or group affected,
such as "every citizen", "eligible farmers", or "adults".

10. "date" identifies an explicit date, year, time period,
or temporal reference.

11. "status" identifies the state of the event when explicitly
stated, such as:
- announced
- proposed
- approved
- implemented
- completed
- planned
- rumored
- reported

12. "conditions" contains explicit conditions or requirements
that affect the claim.

13. Preserve important wording and quantities.
Do not convert or reinterpret amounts.

14. Do not infer a country from a currency symbol alone.

For example, do NOT turn ₹5000 into:
"location": "India"

unless the claim explicitly mentions India.

15. Do not perform web searches.

16. Do not fact-check the claim.

17. Return ONLY JSON.
Do not return markdown.
Do not return reasoning.
      `.trim(),
            },

            {
              role: "user",

              content: `
CLAIM:
${claim}
              `.trim(),
            },
          ],

          stream: false,
          format: "json",
          think: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Ollama claim decomposition failed with status ${response.status}`
      );
    }

    const data =
      (await response.json()) as OllamaResponse;

    const content = data.message?.content;

    if (!content) {
      throw new Error(
        "Ollama returned empty claim decomposition"
      );
    }

    let parsed: OllamaClaimAttributes;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(
        "Ollama returned invalid claim decomposition JSON"
      );
    }

    const conditions =
      Array.isArray(parsed.conditions)
        ? parsed.conditions
        : [];

    return {
      subject:
        parsed.subject ?? null,

      action:
        parsed.action ?? null,

      object:
        parsed.object ?? null,

      amount:
        parsed.amount ?? null,

      location:
        parsed.location ?? null,

      population:
        parsed.population ?? null,

      date:
        parsed.date ?? null,

      status:
        parsed.status ?? null,

      conditions,
    };
  }
}

export const claimDecomposer =
  new OllamaClaimDecomposer();