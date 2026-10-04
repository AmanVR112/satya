import { Router } from "express";
import prisma from "../lib/prisma";
import { aiService } from "../ai/ai.service";
import { researchService } from "../research/research.service";
import { evidenceAnalyzer } from "../ai/evidenceAnalyzer";
import { evidenceAggregator } from "../verification/evidenceAggregator";
import { assessmentEngine } from "../verification/assessmentEngine";
import { claimDecomposer } from "../ai/claimDecomposer";
import { evidenceAttributeExtractor } from "../ai/evidenceAttributeExtractor";
import { claimEvidenceComparator } from "../verification/claimEvidenceComparator";
import { verificationService } from "../verification/verification.service";
import { claimCoverageAnalyzer } from "../ai/claimCoverageAnalyzer";

const router = Router();

router.post(
  "/test-claim-coverage",
  async (req, res) => {
    try {
      const {
        claim,
        evidence,
      } = req.body;

      if (!claim || !evidence) {
        return res.status(400).json({
          message:
            "claim and evidence are required",
        });
      }

      const claimAttributes =
        await claimDecomposer.decomposeClaim(
          claim
        );

      const result =
        await claimCoverageAnalyzer.analyze(
          claim,
          claimAttributes,
          evidence
        );

      return res.json({
        message:
          "Claim coverage analysis completed",
        data: {
          claim,
          evidence,
          claimAttributes,
          coverage: result,
        },
      });
    } catch (error) {
      console.error(
        "Claim coverage analysis error:",
        error
      );

      return res.status(500).json({
        message:
          "Claim coverage analysis failed",
      });
    }
  }
);

router.post("/test-full-verification", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        message: "Text is required",
      });
    }

    const result =
      await verificationService.verifyText(text);

    return res.status(200).json({
      message: "Full verification completed",
      data: result,
    });
  } catch (error) {
    console.error(
      "Full verification error:",
      error
    );

    return res.status(500).json({
      message: "Full verification failed",
    });
  }
});

router.post("/test-claim-evidence-comparison", async (req, res) => {
  try {
    const { claim, evidence } = req.body;

    if (!claim || !evidence) {
      return res.status(400).json({
        message: "Claim and evidence are required",
      });
    }

    const comparison =
      claimEvidenceComparator.compare(
        claim,
        evidence
      );

    return res.status(200).json({
      message: "Claim-evidence comparison completed",
      data: comparison,
    });
  } catch (error) {
    console.error(
      "Claim-evidence comparison error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to compare claim and evidence",
    });
  }
});

router.post("/test-evidence-attributes", async (req, res) => {
  try {
    const { evidence } = req.body;

    if (!evidence || typeof evidence !== "string") {
      return res.status(400).json({
        message: "Evidence is required",
      });
    }

    const attributes =
      await evidenceAttributeExtractor.extractAttributes(
        evidence
      );

    return res.status(200).json({
      message: "Evidence attribute extraction completed",
      data: attributes,
    });
  } catch (error) {
    console.error(
      "Evidence attribute extraction error:",
      error
    );

    return res.status(500).json({
      message: "Failed to extract evidence attributes",
    });
  }
});

router.post("/test-decomposition", async (req, res) => {
  try {
    const { claim } = req.body;

    if (!claim || typeof claim !== "string") {
      return res.status(400).json({
        message: "claim is required",
      });
    }

    const result =
      await claimDecomposer.decomposeClaim(claim);

    return res.status(200).json({
      message: "Claim decomposition completed",
      data: result,
    });
  } catch (error) {
    console.error(
      "Claim decomposition test error:",
      error
    );

    return res.status(500).json({
      message: "Claim decomposition failed",
    });
  }
});

router.post("/test-assessment", async (req, res) => {
  try {
    const { evidence, comparisons } = req.body;

    if (!evidence || !comparisons) {
      return res.status(400).json({
        message:
          "Evidence and comparisons are required",
      });
    }

    const result = assessmentEngine.assess({
      evidence,
      comparisons,
    });

    return res.status(200).json({
      message: "Assessment completed",
      data: result,
    });
  } catch (error) {
    console.error(
      "Assessment test error:",
      error
    );

    return res.status(500).json({
      message: "Assessment failed",
    });
  }
});

router.post("/test-aggregation", async (req, res) => {
  try {
    const { evidenceItems } = req.body;

    if (!Array.isArray(evidenceItems)) {
      return res.status(400).json({
        message: "evidenceItems must be an array",
      });
    }

    const result =
      evidenceAggregator.aggregate(
        evidenceItems
      );

    return res.status(200).json({
      message: "Evidence aggregation completed",
      data: result,
    });
  } catch (error) {
    console.error(
      "Evidence aggregation test error:",
      error
    );

    return res.status(500).json({
      message: "Evidence aggregation failed",
    });
  }
});

router.post("/test-evidence-analysis", async (req, res) => {
  try {
    const { claim, evidence } = req.body;

    if (!claim || !evidence) {
      return res.status(400).json({
        message: "claim and evidence are required",
      });
    }

    const result =
      await evidenceAnalyzer.analyze(
        claim,
        evidence
      );

    return res.status(200).json({
      message: "Evidence analysis completed",
      data: result,
    });
  } catch (error) {
    console.error(
      "Evidence analysis test error:",
      error
    );

    return res.status(500).json({
      message: "Evidence analysis failed",
    });
  }
});

router.post("/test-research", async (req, res) => {
  try {
    const { claim } = req.body;

    if (!claim || typeof claim !== "string") {
      return res.status(400).json({
        message: "claim is required",
      });
    }

    const verificationRequest =
      await prisma.verificationRequest.create({
        data: {
          extractedText: claim,
        },
      });

    const testClaim =
      await prisma.claim.create({
        data: {
          verificationRequestId:
            verificationRequest.id,
          claim,
          claimType: "FACTUAL",
          needsVerification: true,
        },
      });

    const result =
      await researchService.searchClaim(
        testClaim.id,
        claim
      );

    return res.status(200).json({
      message: "Research completed",
      data: {
        claimId: testClaim.id,
        claim,
        research: result,
      },
    });
  } catch (error) {
    console.error(
      "Research test error:",
      error
    );

    return res.status(500).json({
      message: "Research failed",
    });
  }
});

router.post("/", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        message: "Text is required",
      });
    }

    const claims =
      await aiService.extractClaims(text);

    const verification =
      await prisma.verificationRequest.create({
        data: {
          extractedText: text,

          claims: {
            create: claims.map((claim) => ({
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

    return res.status(201).json({
      message:
        "Verification request created",
      data: verification,
    });
  } catch (error) {
    console.error(
      "Verification creation error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to create verification request",
    });
  }
});

export default router;