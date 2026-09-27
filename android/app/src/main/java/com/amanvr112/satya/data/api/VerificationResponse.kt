package com.amanvr112.satya.data.api

data class VerificationResponse(
    val message: String,
    val data: VerificationData
)

data class VerificationData(
    val id: String,
    val extractedText: String,
    val status: String,
    val createdAt: String,
    val updatedAt: String
)