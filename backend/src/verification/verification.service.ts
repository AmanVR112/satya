import prisma from "../lib/prisma";
import { aiService } from "../ai/ai.service";
import { claimDecomposer } from "../ai/claimDecomposer";
import { evidenceAttributeExtractor } from "../ai/evidenceAttributeExtractor";
import { evidenceAnalyzer } from "../ai/evidenceAnalyzer";

import { researchService } from "../research/research.service";

import { evidenceAggregator } from "./evidenceAggregator";
import { assessmentEngine } from "./assessmentEngine";

class VerificationService {
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

                evidenceAnalyses.push(analysis);
            }

            /*
             * STEP 7
             * Aggregate all evidence relations.
             *
             * This happens AFTER every evidence item
             * has been analyzed.
             */
            const aggregatedEvidence =
                evidenceAggregator.aggregate(
                    evidenceAnalyses
                );

            /*
             * STEP 8
             * Produce the final assessment.
             *
             * The experimental claim/evidence comparator
             * is intentionally not used for the assessment
             * yet because its attribute extraction can
             * introduce false material differences.
             *
             * Evidence relation is currently the primary
             * signal for the assessment engine.
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
         * fields to the database. That will come after
         * this orchestration layer is validated.
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