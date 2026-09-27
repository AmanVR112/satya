import {
    AIService,
    ExtractedClaim,
} from "./ai.types";

interface OllamaResponse {
    message?: {
        content?: string;
    };
}

interface OllamaClaimsResponse {
    claims?: ExtractedClaim[];
}

class OllamaClaimExtractor implements AIService {
    private readonly ollamaUrl = "http://localhost:11434/api/chat";
    private readonly model = "qwen3.5:4b";

    async extractClaims(text: string): Promise<ExtractedClaim[]> {
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
You are the claim extraction engine for Satya.

Your job is to identify claims in the provided text that may need factual verification.

Return ONLY valid JSON in this exact structure:

{
  "claims": [
    {
      "claim": "string",
      "claimType": "FACTUAL",
      "needsVerification": true
    }
  ]
}

Allowed claimType values:
- FACTUAL
- OPINION
- QUESTION
- OTHER

Rules:

1. FACTUAL
Use FACTUAL for statements that assert something about the real world
and could potentially be checked against evidence.

2. OPINION
Use OPINION only when the text expresses a belief, judgment,
preference, or subjective view.

3. QUESTION
Use QUESTION when the text is asking a question rather than making
a factual assertion.

4. OTHER
Use OTHER for instructions, commands, calls-to-action, greetings,
advertising language, or text that is not a claim.

5. Do NOT turn instructions into factual claims.
For example:
"Apply before midnight."
"Share this message."
"Click this link."
These are instructions and should normally be OTHER with
needsVerification set to false.

6. Do NOT invent facts that are not present in the original text.

7. Preserve the meaning of the original text.

8. Split clearly separate factual claims when appropriate.

9. A factual claim that could be checked should have:
needsVerification: true

10. Opinions, questions, instructions, and other non-verifiable text
should normally have:
needsVerification: false

11. Return ONLY JSON.
Do not return markdown.
Do not return explanations.
Do not return reasoning.
`.trim(),
                    },
                    {
                        role: "user",
                        content: text,
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
            throw new Error("Ollama returned empty content");
        }

        let parsed: OllamaClaimsResponse;

        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error("Ollama returned invalid JSON");
        }

        if (!Array.isArray(parsed.claims)) {
            throw new Error("Ollama response does not contain a claims array");
        }

        return parsed.claims;
    }
}

export const ollamaClaimExtractor =
    new OllamaClaimExtractor();