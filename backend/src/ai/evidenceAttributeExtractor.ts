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
You extract structured attributes from evidence text for Satya.

Your task is ONLY to extract what the evidence explicitly states.

Do NOT determine whether the evidence supports or contradicts any claim.
Do NOT fact-check the evidence.
Do NOT infer missing information.
Do NOT invent information.

RETURN ONLY JSON.

ALL NINE FIELDS ARE REQUIRED.

You MUST always return:

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

Never omit any field.

If a field is not explicitly present in the evidence, return null.

"conditions" MUST always be an array.
If there are no explicit conditions, return [].

FIELDS:

subject:
The person, organization, government, institution, or entity
performing or being discussed in the evidence.

action:
The main action explicitly described.

object:
The thing, event, policy, payment, statement, product, or subject
acted upon.

amount:
Extract an explicit numerical amount, quantity, percentage,
or monetary value if present.

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
Extract the explicitly stated group of people affected,
targeted, eligible, or mentioned.

date:
Extract an explicitly stated date or time reference.

status:
Extract the status explicitly expressed by the evidence.

Examples:
"announced"
"proposed"
"approved"
"implemented"
"completed"
"planned"
"rumored"
"reported"

conditions:
List explicit conditions, restrictions, eligibility requirements,
qualifications, or other explicit conditions.

If none exist, return [].

IMPORTANT RULES:

1. Preserve the meaning and wording of the evidence.

2. Extract ONLY information explicitly stated in the evidence.

3. Do NOT infer a country from a currency symbol alone.

4. Do NOT infer missing dates.

5. Do NOT infer missing locations.

6. Do NOT infer missing populations.

7. Do NOT infer missing conditions.

8. Do NOT infer causality.

9. Do NOT determine whether the evidence is true or false.

10. Do NOT determine whether the evidence supports or contradicts
    a claim.

11. If an amount exists, put it in the amount field even if the
    same information also appears in object.

12. If a field is not explicitly present, return null.

13. conditions must ALWAYS be an array.

14. Do not add information from your general knowledge.

15. Do not rewrite the evidence into a stronger or weaker statement.

16. Do not convert implied information into explicit information.

17. Return valid JSON only.

18. All nine fields must always be present.

19. Do not return markdown.

20. Do not return code fences.

21. Do not return explanations outside the JSON object.
            `.trim(),
          },

          {
            role: "user",
            content: `EVIDENCE:
${evidence}`,
          },
        ],

        stream: false,

        /*
         * Use a JSON schema instead of plain "json".
         * This requires Ollama/Qwen to return all expected fields
         * with the correct basic types.
         */
        format: {
          type: "object",

          properties: {
            subject: {
              type: ["string", "null"],
            },

            action: {
              type: ["string", "null"],
            },

            object: {
              type: ["string", "null"],
            },

            amount: {
              type: ["string", "null"],
            },

            location: {
              type: ["string", "null"],
            },

            population: {
              type: ["string", "null"],
            },

            date: {
              type: ["string", "null"],
            },

            status: {
              type: ["string", "null"],
            },

            conditions: {
              type: "array",

              items: {
                type: "string",
              },
            },
          },

          required: [
            "subject",
            "action",
            "object",
            "amount",
            "location",
            "population",
            "date",
            "status",
            "conditions",
          ],

          additionalProperties: false,
        },

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
        `Ollama returned invalid JSON for evidence attributes. Raw output: ${content}`
      );
    }


    /*
     * Validate that the model returned the expected object.
     */
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw new Error(
        "Ollama evidence attribute response is not a JSON object"
      );
    }

    /*
     * Validate required fields.
     */
    const requiredFields = [
      "subject",
      "action",
      "object",
      "amount",
      "location",
      "population",
      "date",
      "status",
      "conditions",
    ] as const;

    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(
          `Ollama evidence attribute response is missing required field: ${field}`
        );
      }
    }

    /*
     * Validate string-or-null fields.
     */
    const nullableStringFields = [
      "subject",
      "action",
      "object",
      "amount",
      "location",
      "population",
      "date",
      "status",
    ] as const;

    for (const field of nullableStringFields) {
      const value = parsed[field];

      if (
        value !== null &&
        typeof value !== "string"
      ) {
        throw new Error(
          `Invalid evidence attribute field "${field}": expected string or null`
        );
      }
    }

    /*
     * Validate conditions.
     */
    if (!Array.isArray(parsed.conditions)) {
      throw new Error(
        "Invalid evidence attribute field \"conditions\": expected an array"
      );
    }

    if (
      !parsed.conditions.every(
        (condition) =>
          typeof condition === "string"
      )
    ) {
      throw new Error(
        "Invalid evidence attribute field \"conditions\": every condition must be a string"
      );
    }

    /*
     * Normalize whitespace in extracted string values.
     * Null values remain null.
     */
    const normalizeNullableString = (
      value: string | null | undefined
    ): string | null => {
      if (value === null || value === undefined) {
        return null;
      }

      const normalized = value.trim();

      return normalized.length > 0
        ? normalized
        : null;
    };

    const conditions = parsed.conditions
      .map((condition) => condition.trim())
      .filter(
        (condition) => condition.length > 0
      );

    return {
      subject: normalizeNullableString(
        parsed.subject
      ),

      action: normalizeNullableString(
        parsed.action
      ),

      object: normalizeNullableString(
        parsed.object
      ),

      amount: normalizeNullableString(
        parsed.amount
      ),

      location: normalizeNullableString(
        parsed.location
      ),

      population: normalizeNullableString(
        parsed.population
      ),

      date: normalizeNullableString(
        parsed.date
      ),

      status: normalizeNullableString(
        parsed.status
      ),

      conditions,
    };
  }
}

export const evidenceAttributeExtractor =
  new OllamaEvidenceAttributeExtractor();