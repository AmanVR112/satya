package com.amanvr112.satya.data.api

import retrofit2.http.Body
import retrofit2.http.POST

interface SatyaApi {

    @POST("verification")
    suspend fun createVerification(
        @Body request: VerificationRequest
    ): VerificationResponse
}