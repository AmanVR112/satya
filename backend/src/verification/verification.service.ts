import prisma from "../lib/prisma";
import { aiService } from "../ai/ai.service";
import { claimDecomposer } from "../ai/claimDecomposer";
import { evidenceAttributeExtractor } from "../ai/evidenceAttributeExtractor";
import { evidenceAnalyzer } from "../ai/evidenceAnalyzer";
import { claimCoverageAnalyzer } from "../ai/claimCoverageAnalyzer";
import { temporalResolver } from "../ai/temporalResolver";

import { researchService } from "../research/research.service";

import { evidenceAggregator } from "./evidenceAggregator";
import { assessmentEngine } from "./assessmentEngine";

class VerificationService {
    private resolveTemporalConflicts(
        evidenceAnalyses: any[]
    ): any[] {
        const stateChangingStates = new Set([
            "CANCELLED",
            "CALLED_OFF",
            "DEFERRED",
            "POSTPONED",
        ]);

        const stateChangingEvidence = evidenceAnalyses
            .filter(
                (evidence) =>
                    stateChangingStates.has(
                        evidence.temporalState
                    ) &&
                    evidence.temporalChangesClaimState === true &&
                    evidence.publishedAt
            )
            .sort(
                (a, b) =>
                    new Date(a.publishedAt).getTime() -
                    new Date(b.publishedAt).getTime()
            );

        if (stateChangingEvidence.length === 0) {
            return evidenceAnalyses;
        }

        const latestStateChange =
            stateChangingEvidence[
            stateChangingEvidence.length - 1
            ];

        const latestStateChangeDate =
            new Date(latestStateChange.publishedAt).getTime();

        return evidenceAnalyses.map((evidence) => {
            if (
                evidence === latestStateChange
            ) {
                return evidence;
            }

            if (
                !evidence.publishedAt ||
                new Date(evidence.publishedAt).getTime() >=
                latestStateChangeDate
            ) {
                return evidence;
            }

            if (
                evidence.temporalState === "PLANNED" ||
                evidence.temporalState === "SCHEDULED" ||
                evidence.temporalState === "EXPECTED"
            ) {
                return {
                    ...evidence,
                    relation:
                        evidence.relation === "SUPPORTS"
                            ? "CONTEXT_ONLY"
                            : evidence.relation,
                    directness:
                        evidence.relation === "SUPPORTS"
                            ? "NONE"
                            : evidence.directness,
                    explanation:
                        `${evidence.explanation} ` +
                        `This evidence describes an earlier planned or scheduled state that was later superseded by explicit ${latestStateChange.temporalState.toLowerCase()} evidence published on ${latestStateChange.publishedAt}.`,
                };
            }

            return evidence;
        });
    }
    async verifyText(text: string) {
        /*
         * STEP 1
         * Extract claims from the input text.
         */
        const extractedClaims =
            await aiService.extractClaims(text);

        /*
         * STEP 2
         * Create the verification request and
         * persist the extracted claims.
         */
        const verification =
            await prisma.verificationRequest.create({
                data: {
                    extractedText: text,

                    claims: {
                        create: extractedClaims.map((claim) => ({
                            claim: claim.claim,
                            claimType: claim.claimType,
                            needsVerification:
                                claim.needsVerification,
                        })),
                    },
                },

                include: {
                    claims: true,
                },
            });

        const results = [];

        /*
         * STEP 3
         * Process each extracted claim independently.
         */
        for (const claim of verification.claims) {
            /*
             * Only factual claims that require
             * verification should enter the
             * verification pipeline.
             */
            if (
                claim.claimType !== "FACTUAL" ||
                !claim.needsVerification
            ) {
                results.push({
                    claimId: claim.id,
                    claim: claim.claim,
                    claimType: claim.claimType,
                    skipped: true,
                    reason:
                        "Claim does not require factual verification.",
                });

                continue;
            }

            /*
             * STEP 4
             * Decompose the claim into structured
             * attributes.
             */
            const claimAttributes =
                await claimDecomposer.decomposeClaim(
                    claim.claim
                );

            /*
             * STEP 5
             * Search the web using Tavily.
             */
            const research =
                await researchService.searchClaim(
                    claim.id,
                    claim.claim
                );

            /*
             * STEP 6
             * Analyze every retrieved evidence item.
             *
             * Each evidence item now receives TWO
             * separate analyses:
             *
             * 1. Evidence relationship
             *    SUPPORTS / CONTRADICTS /
             *    CONTEXT_ONLY / IRRELEVANT
             *
             * 2. Claim coverage
             *    FULL / PARTIAL / NONE
             */
            const evidenceAnalyses = [];

            for (const evidence of research.evidence) {
                /*
                 * Extract structured attributes from
                 * the evidence.
                 *
                 * This is currently retained for
                 * diagnostic purposes.
                 */
                await evidenceAttributeExtractor.extractAttributes(
                    evidence.excerpt
                );

                /*
                 * Determine how the evidence relates
                 * to the claim.
                 */
                const analysis =
                    await evidenceAnalyzer.analyze(
                        claim.claim,
                        evidence.excerpt
                    );

                /*
                 * Determine how much of the COMPLETE
                 * claim the evidence actually establishes.
                 */
                const coverage =
                    await claimCoverageAnalyzer.analyze(
                        claim.claim,
                        claimAttributes,
                        evidence.excerpt
                    );

                /*
                 * Determine the temporal state described
                 * by this evidence and whether it explicitly
                 * changes the state of the claim.
                 */

                const temporal =
                    await temporalResolver.resolve(
                        claim.claim,
                        evidence.excerpt,
                        evidence.source.publishedAt
                    );

                /*
* Deterministic temporal safety guard.
*
* If the evidence describes a planned/scheduled/expected
* event and does not explicitly change the claim state,
* it must not be treated as a contradiction.
*
* The LLM evidence analyzer can otherwise incorrectly use
* nearby dates or future plans as contradictions.
*/
                let normalizedAnalysis = analysis;

                if (
                    analysis.relation === "CONTRADICTS" &&
                    (
                        temporal.state === "PLANNED" ||
                        temporal.state === "SCHEDULED" ||
                        temporal.state === "EXPECTED"
                    ) &&
                    temporal.changesClaimState === false
                ) {
                    normalizedAnalysis = {
                        ...analysis,
                        relation: "CONTEXT_ONLY",
                        directness: "NONE",
                        explanation:
                            "The evidence describes a planned, scheduled, or expected event without explicitly changing the claim state, so it cannot be treated as a contradiction.",
                    };
                }

                let normalizedCoverage = coverage;

                if (
                    coverage.coverage === "FULL" &&
                    (
                        temporal.state === "PLANNED" ||
                        temporal.state === "SCHEDULED" ||
                        temporal.state === "EXPECTED"
                    ) &&
                    temporal.changesClaimState === false
                ) {
                    normalizedCoverage = {
                        ...coverage,
                        coverage: "PARTIAL",
                        unsupportedParts: [
                            ...coverage.unsupportedParts,
                            "future/planned status is not yet established",
                        ],
                        explanation:
                            `${coverage.explanation} However, the evidence describes the event as planned, scheduled, or expected rather than establishing the future state as confirmed.`,
                    };
                }

                /*
 * Deterministic relationship/coverage consistency guard.
 *
 * Coverage is an independent measure of how much of the claim
 * the evidence establishes.
 *
 * If the evidence explicitly establishes the complete claim,
 * it cannot simultaneously be IRRELEVANT.
 *
 * This protects against an LLM relationship-classification error
 * overriding a clear FULL coverage result.
 */
                if (
                    normalizedCoverage.coverage === "FULL" &&
                    normalizedCoverage.supportedParts.length > 0 &&
                    (
                        normalizedAnalysis.relation === "IRRELEVANT" ||
                        normalizedAnalysis.relation === "CONTEXT_ONLY"
                    )
                ) {
                    normalizedAnalysis = {
                        ...normalizedAnalysis,
                        relation: "SUPPORTS",
                        directness: "DIRECT",
                        explanation:
                            `${normalizedAnalysis.explanation} ` +
                            `The coverage analysis explicitly establishes the complete claim, so the evidence is treated as supporting evidence.`,
                    };
                }

                /*
 * Deterministic evidence consistency guards.
 *
 * The LLM must not be allowed to:
 * 1. Mark evidence as CONTRADICTS when its own explanation says
 *    the claim is not contradicted.
 * 2. Mark explicit evidence as CONTEXT_ONLY/IRRELEVANT when the
 *    evidence directly states the claim.
 */

                // Guard 1: prevent self-contradictory contradiction classifications.
                if (
                    normalizedAnalysis.relation === "CONTRADICTS" &&
                    normalizedCoverage.coverage === "NONE" &&
                    /not contradicted|does not contradict|no contradiction/i.test(
                        normalizedAnalysis.explanation
                    )
                ) {
                    normalizedAnalysis = {
                        ...normalizedAnalysis,
                        relation: "CONTEXT_ONLY",
                        directness: "NONE",
                        explanation:
                            `${normalizedAnalysis.explanation} ` +
                            `The analysis explicitly states that the evidence does not contradict the claim, so the contradiction classification was normalized to contextual evidence.`,
                    };
                }

                // Guard 2: explicit evidence of the complete claim is support.
                if (
                    normalizedCoverage.coverage === "FULL" &&
                    normalizedCoverage.supportedParts.length > 0 &&
                    (
                        normalizedAnalysis.relation === "IRRELEVANT" ||
                        normalizedAnalysis.relation === "CONTEXT_ONLY"
                    )
                ) {
                    normalizedAnalysis = {
                        ...normalizedAnalysis,
                        relation: "SUPPORTS",
                        directness: "DIRECT",
                        explanation:
                            `${normalizedAnalysis.explanation} ` +
                            `The coverage analysis explicitly establishes the complete claim, so the evidence is treated as supporting evidence.`,
                    };
                }

                /*
                 * Keep the relationship and coverage
                 * together for this evidence item.
                 */
                evidenceAnalyses.push({
                    ...normalizedAnalysis,

                    coverage: normalizedCoverage.coverage,

                    supportedParts:
                        normalizedCoverage.supportedParts,

                    unsupportedParts:
                        normalizedCoverage.unsupportedParts,

                    coverageExplanation:
                        normalizedCoverage.explanation,

                    temporalState:
                        temporal.state,

                    temporalChangesClaimState:
                        temporal.changesClaimState,

                    temporalExplanation:
                        temporal.explanation,

                    publishedAt:
                        evidence.source.publishedAt,
                });
            }

            /*
             * STEP 7
             * Aggregate evidence relations.
             *
             * The existing aggregator still works
             * only with the evidence relationship data.
             *
             * We are intentionally NOT changing the
             * assessment logic yet.
             */
            const temporallyResolvedEvidence =
                this.resolveTemporalConflicts(
                    evidenceAnalyses
                );

            const aggregatedEvidence =
                evidenceAggregator.aggregate(
                    temporallyResolvedEvidence
                );

            /*
             * STEP 8
             * Produce the final assessment.
             *
             * Coverage information is currently
             * diagnostic only.
             *
             * We will update assessment logic after
             * validating the integrated coverage results.
             */
            const assessment =
                assessmentEngine.assess({
                    evidence: aggregatedEvidence,
                    comparisons: [],
                });

            /*
             * STEP 9
             * Store the result for this claim.
             */
            results.push({
                claimId: claim.id,
                claim: claim.claim,
                claimType: claim.claimType,

                claimAttributes,

                research,

                evidenceAnalyses,

                comparisons: [],

                aggregatedEvidence,

                assessment,

                skipped: false,
            });
        }

        /*
         * STEP 10
         * Mark the verification request as completed.
         *
         * We are not yet adding per-claim assessment
         * fields to the database.
         */
        await prisma.verificationRequest.update({
            where: {
                id: verification.id,
            },
            data: {
                status: "COMPLETED",
            },
        });

        /*
         * STEP 11
         * Return the complete verification result.
         */
        return {
            verificationId: verification.id,
            extractedText: text,
            results,
        };
    }
}

export const verificationService =
    new VerificationService();