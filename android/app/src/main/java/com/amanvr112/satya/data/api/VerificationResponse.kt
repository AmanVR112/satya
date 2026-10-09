package com.amanvr112.satya.data.api

data class VerificationResponse(
    val message: String?,
    val data: VerificationData
)

data class VerificationData(
    val verificationId: String,
    val extractedText: String,
    val results: List<ClaimVerificationResult>
)

data class ClaimVerificationResult(
    val claimId: String?,
    val claim: String?,
    val claimType: String?,
    val assessment: ClaimAssessment?,
    val skipped: Boolean?
)

data class ClaimAssessment(
    val assessment: String,
    val explanation: String
)