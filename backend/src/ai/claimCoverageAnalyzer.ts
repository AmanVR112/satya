import { ExtractedClaim } from "./ai.types";
import { ClaimAttributes } from "./claimDecomposer.types";

export type CoverageLevel =
    | "FULL"
    | "PARTIAL"
    | "NONE";

export interface ClaimCoverage {
    coverage: CoverageLevel;
    supportedParts: string[];
    unsupportedParts: string[];
    explanation: string;
}

interface OllamaResponse {
    message?: {
        content?: string;
    };
}

interface OllamaCoverageResponse {
    coverage?: CoverageLevel;
    supportedParts?: string[];
    unsupportedParts?: string[];
    explanation?: string;
}

class ClaimCoverageAnalyzer {
    private readonly ollamaUrl =
        "http://localhost:11434/api/chat";

    private readonly model = "qwen3.5:4b";

    async analyze(
        claim: ExtractedClaim | string,
        claimAttributes: ClaimAttributes,
        evidence: string
    ): Promise<ClaimCoverage> {
        const claimText =
            typeof claim === "string"
                ? claim
                : claim.claim;

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
You are the claim coverage analyzer for Satya.

Your job is to determine HOW MUCH OF A CLAIM is actually established
by ONE PIECE OF EVIDENCE.

This is NOT a final truth verdict.

Do not decide whether the claim is true or false.

Instead, determine whether the evidence establishes:

- the complete claim
- only part of the claim
- none of the important claim

Return ONLY valid JSON in this exact structure:

{
  "coverage": "FULL",
  "supportedParts": [
    "..."
  ],
  "unsupportedParts": [
    "..."
  ],
  "explanation": "short factual explanation"
}

Allowed coverage values:

- FULL
- PARTIAL
- NONE

CORE PRINCIPLE:

A piece of evidence can be relevant and even supportive without
establishing the entire claim.

Do NOT treat general support as full support.

For example:

CLAIM:
"AI companies bought the entire stock of RAM and SSD chips."

EVIDENCE:
"AI demand is increasing pressure on global memory supply."

Correct interpretation:

- AI demand → supported
- supply pressure → supported
- entire stock bought → NOT established
- RAM and SSD both completely bought → NOT established

Therefore:

coverage = PARTIAL

FULL:

Use FULL only when the evidence establishes the important factual
components of the complete claim.

PARTIAL:

Use PARTIAL when the evidence establishes some important components
but leaves other important components unsupported, unproven, weaker,
or more specific than the evidence.

NONE:

Use NONE when the evidence does not establish any important part of
the claim.

IMPORTANT CLAIM COMPONENTS:

Pay attention to:

- subject
- action
- object
- amount
- location
- population
- date
- status
- conditions
- causal relationships
- quantities
- scope
- qualifiers

ENTITY MATCHING IS NOT CLAIM COVERAGE:

Matching the subject, person, organization, product, or other entity
does NOT by itself count as a supported part of the claim.

The evidence must establish a meaningful factual predicate about
that entity.

Example:

CLAIM:
"K.R. Mangalam University has a 100% placement rate."

EVIDENCE:
"K.R. Mangalam University provides 100% placement assistance."

The university matches, but the evidence does not establish the
placement rate.

Therefore:

coverage = NONE

Do NOT list the matching subject as a supported part unless the
evidence also establishes a meaningful part of the claim's actual
predicate.

Another example:

CLAIM:
"Company X has a ₹50 lakh average salary."

EVIDENCE:
"Company X employs 10,000 people."

Correct:
NONE

The evidence identifies the same company but does not establish
anything about the average salary.

STRONG QUALIFIERS:

Treat strong words as important claim components.

Examples:

- all
- entire
- every
- none
- never
- always
- completely
- exactly
- 100%
- only
- first
- largest
- guaranteed
- impossible

Evidence that establishes a weaker statement does NOT automatically
establish a stronger statement.

Example:

CLAIM:
"100% of students got jobs."

EVIDENCE:
"Most students got jobs."

Correct:
PARTIAL

Example:

CLAIM:
"AI companies bought the entire supply."

EVIDENCE:
"AI companies increased demand."

Correct:
PARTIAL

NUMBERS:

Pay attention to exact quantities.

Example:

CLAIM:
"The placement rate is 100%."

EVIDENCE:
"The placement rate is 92%."

The evidence does not establish the claim.

Use:

NONE

Example:

CLAIM:
"The placement rate is 100%."

EVIDENCE:
"The university provides 100% placement assistance."

Do NOT treat "placement assistance" as equivalent to
"placement rate".

Use:

NONE

or PARTIAL only if the evidence establishes another meaningful
component of the claim.

CAUSAL CLAIMS:

For claims containing causal language such as:

- because
- caused by
- due to
- resulted from
- responsible for
- led to

the evidence must support the causal relationship itself.

Evidence that only shows that two things happened does not
automatically establish causation.

Example:

CLAIM:
"AI companies caused RAM prices to rise."

EVIDENCE:
"RAM prices rose while AI demand increased."

This may support correlation or context, but it does not necessarily
establish causation.

Prefer:

PARTIAL

unless the evidence explicitly establishes the causal relationship.

SCOPE:

Do not expand evidence beyond what it actually says.

Example:

CLAIM:
"AI companies bought all RAM and SSD chips."

EVIDENCE:
"AI data centers consumed a large share of DRAM production."

The evidence may support the RAM/AI-demand relationship but does not
establish:

- all RAM
- SSD
- bought by AI companies
- complete depletion

Therefore:

PARTIAL

DO NOT INVENT INFORMATION.

Only identify support that is explicitly present or clearly established
by the evidence.

Do not infer missing dates, locations, quantities, populations, or
conditions.

The claim attributes are provided only as structured context.
They are not evidence.

Keep supportedParts and unsupportedParts concise.

Return ONLY JSON.
Do not return markdown.
Do not return reasoning.
`.trim(),
                        },

                        {
                            role: "user",

                            content: `
CLAIM:
${claimText}

CLAIM ATTRIBUTES:
${JSON.stringify(claimAttributes)}

EVIDENCE:
${evidence}
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
                `Ollama claim coverage analysis failed with status ${response.status}`
            );
        }

        const data =
            (await response.json()) as OllamaResponse;

        const content =
            data.message?.content;

        if (!content) {
            throw new Error(
                "Ollama returned empty claim coverage analysis"
            );
        }

        let parsed: OllamaCoverageResponse;

        try {
            parsed = JSON.parse(content);
        } catch {
            throw new Error(
                "Ollama returned invalid claim coverage JSON"
            );
        }

        if (
            !parsed.coverage ||
            ![
                "FULL",
                "PARTIAL",
                "NONE",
            ].includes(parsed.coverage)
        ) {
            throw new Error(
                "Invalid claim coverage returned by Ollama"
            );
        }

        if (
            !Array.isArray(parsed.supportedParts)
        ) {
            throw new Error(
                "Ollama returned invalid supportedParts"
            );
        }

        if (
            !Array.isArray(parsed.unsupportedParts)
        ) {
            throw new Error(
                "Ollama returned invalid unsupportedParts"
            );
        }

        if (
            typeof parsed.explanation !== "string" ||
            !parsed.explanation.trim()
        ) {
            throw new Error(
                "Ollama returned no claim coverage explanation"
            );
        }

        return {
            coverage: parsed.coverage,
            supportedParts:
                parsed.supportedParts,
            unsupportedParts:
                parsed.unsupportedParts,
            explanation:
                parsed.explanation,
        };
    }
}

export const claimCoverageAnalyzer =
    new ClaimCoverageAnalyzer();