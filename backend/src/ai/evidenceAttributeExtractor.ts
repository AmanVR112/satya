import {
  EvidenceAttributes,
  EvidenceAttributeExtractor,
} from "./evidenceAttributeExtractor.types";

interface OllamaResponse {
  message?: {
    content?: string;
  };
}

interface OllamaEvidenceAttributes {
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

class OllamaEvidenceAttributeExtractor
  implements EvidenceAttributeExtractor
{
  private readonly ollamaUrl =
    "http://localhost:11434/api/chat";

  private readonly model = "qwen3.5:4b";

  async extractAttributes(
    evidence: string
  ): Promise<EvidenceAttributes> {
    const response = await fetch(this.ollamaUrl, {
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
You extract structured attributes from evidence text.

Your task is ONLY to extract what the evidence explicitly states.

Do NOT determine whether the evidence supports or contradicts any claim.
Do NOT fact-check the evidence.
Do NOT infer missing information.
Do NOT invent information.

Return JSON only.

Fields:

subject:
The person, organization, government, institution, or entity performing or being discussed in the evidence.

action:
The main action explicitly described.

object:
The thing, event, policy, payment, statement, product, or subject acted upon.

amount:
Extract an explicit numerical amount, quantity, percentage, or monetary value if present.

Examples:
"$1000"
"₹5000"
"€200"
"20%"
"10,000 rupees"

If no explicit amount or numerical quantity exists, return null.

location:
Extract an explicitly stated geographic location.

population:
Extract the explicitly stated group of people affected, targeted, eligible, or mentioned.

date:
Extract an explicitly stated date or time reference.

status:
Extract the status explicitly expressed by the evidence.

Examples:
announced
proposed
approved
implemented
completed
planned
rumored
reported

conditions:
List explicit conditions, restrictions, eligibility requirements, or qualifications.

If none exist, return [].

Important rules:

1. Preserve the meaning and wording of the evidence.
2. Do not infer a country from a currency symbol alone.
3. Do not infer missing dates, locations, populations, or conditions.
4. If an amount exists, put it in the amount field even if it also appears in object.
5. If a field is not explicitly present, return null.
6. conditions must always be an array.
7. Return valid JSON only.

Expected format:

{
  "subject": "string or null",
  "action": "string or null",
  "object": "string or null",
  "amount": "string or null",
  "location": "string or null",
  "population": "string or null",
  "date": "string or null",
  "status": "string or null",
  "conditions": []
}
            `.trim(),
          },
          {
            role: "user",
            content: `EVIDENCE:\n${evidence}`,
          },
        ],

        stream: false,
        format: "json",
        think: false,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama request failed with status ${response.status}`
      );
    }

    const data =
      (await response.json()) as OllamaResponse;

    const content = data.message?.content;

    if (!content) {
      throw new Error(
        "Ollama returned an empty response"
      );
    }

    let parsed: OllamaEvidenceAttributes;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(
        "Ollama returned invalid JSON"
      );
    }

    const conditions = Array.isArray(parsed.conditions)
      ? parsed.conditions
      : [];

    return {
      subject: parsed.subject ?? null,
      action: parsed.action ?? null,
      object: parsed.object ?? null,

      amount: parsed.amount ?? null,
      location: parsed.location ?? null,
      population: parsed.population ?? null,

      date: parsed.date ?? null,
      status: parsed.status ?? null,

      conditions,
    };
  }
}

export const evidenceAttributeExtractor =
  new OllamaEvidenceAttributeExtractor();