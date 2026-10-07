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

CORE PRINCIPLE:

A claim should represent a complete verifiable statement or event.

Do NOT split one real-world event into multiple smaller claims merely
because the sentence contains multiple attributes such as:

- subject
- action
- date
- location
- amount
- cause
- condition
- population
- status

If these attributes describe the SAME underlying event or assertion,
keep them together as ONE claim.

For example:

"banks will remain closed due to a strike on 28-30 September 2026 in India"

MUST remain ONE claim:

"banks will remain closed due to a strike on 28-30 September 2026 in India"

Do NOT split it into:

"banks will remain closed"
"the cause is a strike"
"the dates are 28-30 September 2026"
"the location is India"

Those are attributes of the same event, not independent claims.

Another example:

"The Indian government announced a ₹5000 payment for every citizen
starting in October."

This is ONE claim because the amount, population, timing, subject,
and action all describe the same announcement.

Only split text when it contains genuinely independent factual
assertions about different events, subjects, or propositions.

For example:

"The government announced a ₹5000 payment.
The central bank raised interest rates."

These should be TWO claims because they describe separate events.

RULES:

1. FACTUAL

Use FACTUAL for statements that assert something about the real world
and could potentially be checked against evidence.

CAUSAL CLAIMS ARE ALSO FACTUAL:

A statement that claims one real-world event caused, led to, resulted
in, contributed to, or was responsible for another real-world event
is FACTUAL when the causal relationship could potentially be checked
against evidence.

Causal language includes:

- because
- due to
- caused by
- caused
- led to
- resulted in
- resulted from
- contributed to
- responsible for
- reason for
- as a result of
- driven by
- attributed to

Examples:

"RAM prices increased because AI companies bought large amounts
of memory."

→ FACTUAL

"Gold prices fell due to increased interest rates."

→ FACTUAL

"AI demand caused SSD prices to increase."

→ FACTUAL

"The strike caused banks to close."

→ FACTUAL

Do NOT classify a causal claim as OPINION merely because the causal
relationship is uncertain, debatable, or difficult to verify.

If the statement makes a testable assertion about what caused a
real-world event, classify it as FACTUAL.

For example:

"AI companies caused RAM prices to increase."

→ FACTUAL

The fact that the causal claim may later turn out to be unsupported,
partially supported, or contradicted does NOT make it an OPINION.

The verification pipeline should determine whether the causal claim
is supported by evidence.

2. OPINION

Use OPINION ONLY when the statement is explicitly subjective,
such as a belief, preference, personal judgment, taste, or value
judgment.

A statement is NOT an OPINION merely because it may be false,
controversial, uncertain, surprising, politically sensitive, or
difficult to verify.

Examples:

"The Earth is the largest planet in the Solar System."
→ FACTUAL

"The Sun revolves around the Earth."
→ FACTUAL

"India has the largest population in the world."
→ FACTUAL

"Gold prices will rise next month."
→ FACTUAL

These statements may be true, false, uncertain, or predictions,
but they make objectively checkable assertions.

Only use OPINION for statements such as:

"I think this phone is the best."
→ OPINION

"In my opinion, this policy is terrible."
→ OPINION

"Chocolate ice cream is better than vanilla."
→ OPINION


3. QUESTION

Use QUESTION ONLY when the text is grammatically/functionally
asking for information.

Examples:

"Will GST be removed in India?"
→ QUESTION

"Why did gold prices fall?"
→ QUESTION

"Is the Earth the largest planet?"
→ QUESTION

A declarative statement ending with a period is NOT a QUESTION.

"The Sun revolves around the Earth."
→ FACTUAL


4. OTHER

Use OTHER only for text that is not an objectively checkable
assertion and is not a genuine question or opinion.

Examples:

"Apply before midnight."
→ OTHER

"Share this message."
→ OTHER

"Click this link."
→ OTHER

"Welcome to our website."
→ OTHER

Advertisements, navigation text, greetings, commands, and
pure calls-to-action should normally be OTHER.

CLASSIFICATION PRIORITY:

Before assigning a claimType, ask:

1. Is this text a declarative assertion about the real world
   that could be checked against evidence?
   → FACTUAL

2. Is it explicitly subjective or a personal/value judgment?
   → OPINION

3. Is it actually asking a question?
   → QUESTION

4. Otherwise:
   → OTHER

IMPORTANT:

Do NOT use OPINION because a statement sounds unlikely,
controversial, debatable, wrong, or uncertain.

Do NOT use QUESTION because the statement discusses a question,
prediction, possibility, or future event.

Do NOT use OTHER merely because the claim is about the future.

If a statement asserts that something WILL happen, WILL be
announced, WILL change, WILL be removed, or IS expected to happen,
it is still an objectively checkable claim and should normally
be FACTUAL unless it is clearly presented as a subjective opinion
or a request/question.

Truth is NOT determined during claim classification.

The classifier determines whether the statement is objectively
verifiable.

The research and evidence pipeline determines whether it is
SUPPORTED, CONTRADICTED, MISLEADING, or UNVERIFIED.

5. Do NOT turn instructions into factual claims.

For example:

"Apply before midnight."
"Share this message."
"Click this link."

These are instructions and should normally be OTHER with
needsVerification set to false.

6. Do NOT invent facts that are not present in the original text.

7. Preserve the meaning of the original text.

8. Preserve the complete factual context of a claim.

When a factual statement contains important details about the same
event, preserve those details in the claim text.

Important details include:

- who or what is involved
- what happened
- where it happened
- when it happened
- how much
- who is affected
- why it happened
- conditions
- whether something was proposed, announced, approved,
  implemented, completed, planned, or reported

9. Split clearly independent factual claims only when they describe
different events, subjects, actions, or propositions.

10. Do NOT split a claim merely because it contains:

- "and"
- "because"
- "due to"
- "from ... to ..."
- a date
- a location
- an amount
- a condition
- a reason
- a population

These may simply be attributes of the same underlying claim.

11. A factual claim that could be checked should have:

needsVerification: true

12. Opinions, questions, instructions, and other non-verifiable text
should normally have:

needsVerification: false

13. Do not convert predictions into ordinary factual claims simply
because they contain a future date.

If a statement is fundamentally a prediction, keep its meaning intact
rather than pretending that the predicted event has already happened.

14. Do not infer missing information.

15. Do not add explanations, corrections, assumptions, or outside
knowledge.

16. The claim text should remain faithful to the original text.

17. Before splitting a sentence, ask:

"Are these separate facts, or are they multiple attributes of the
same real-world event?"

If they describe the same event, KEEP THEM TOGETHER.

18. Return claims in the order in which they appear in the text.

19. Return ONLY JSON.

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
            throw new Error(
                "Ollama response does not contain a claims array"
            );
        }

        return parsed.claims;
    }
}

export const ollamaClaimExtractor =
    new OllamaClaimExtractor();