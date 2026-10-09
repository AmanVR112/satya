package com.amanvr112.satya.capture

import com.amanvr112.satya.data.api.RetrofitClient
import com.amanvr112.satya.data.api.VerificationRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.cancel

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.DisplayMetrics
import android.util.Log
import android.view.WindowManager

import androidx.core.app.ServiceCompat
import androidx.core.content.IntentCompat

import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

class ScreenCaptureService : Service() {
    
    private val serviceScope =
    CoroutineScope(
        SupervisorJob() + Dispatchers.IO
    )

    private var mediaProjection: MediaProjection? = null
    private var imageReader: ImageReader? = null
    private var virtualDisplay: VirtualDisplay? = null

    private var ocrRunning = false

    
    private val mainHandler =
        Handler(Looper.getMainLooper())

    companion object {

        private const val TAG =
            "SATYA_CAPTURE"

        private const val CHANNEL_ID =
            "satya_capture"

        private const val NOTIFICATION_ID =
            1001

        private const val EXTRA_RESULT_CODE =
            "resultCode"

        private const val EXTRA_DATA =
            "data"
    }

    // ---------------------------------------------------------
    // MediaProjection callback
    // ---------------------------------------------------------

    private val projectionCallback =
        object : MediaProjection.Callback() {

            override fun onStop() {

                Log.d(
                    TAG,
                    "PROJECTION: MediaProjection stopped"
                )

                cleanupAndStopService()
            }
        }

    // ---------------------------------------------------------
    // Service creation
    // ---------------------------------------------------------

    override fun onCreate() {

        super.onCreate()

        Log.d(
            TAG,
            "SERVICE: onCreate() started"
        )

        try {

            createNotificationChannel()

            Log.d(
                TAG,
                "FOREGROUND: Starting foreground service"
            )

            ServiceCompat.startForeground(
                this,
                NOTIFICATION_ID,
                createNotification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            )

            Log.d(
                TAG,
                "FOREGROUND: Service started successfully"
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "FOREGROUND ERROR: ${e.javaClass.name}"
            )

            Log.e(
                TAG,
                "FOREGROUND ERROR MESSAGE: ${e.message}"
            )

            Log.e(
                TAG,
                "FOREGROUND ERROR STACKTRACE",
                e
            )

            stopSelf()
        }
    }

    // ---------------------------------------------------------
    // Service command
    // ---------------------------------------------------------

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        Log.d(
            TAG,
            "SERVICE: onStartCommand() received"
        )

        try {

            if (intent == null) {

                Log.e(
                    TAG,
                    "ERROR: Service intent is null"
                )

                stopSelf()

                return START_NOT_STICKY
            }

            // -------------------------------------------------
            // STEP 1 — Read result code
            // -------------------------------------------------

            Log.d(
                TAG,
                "STEP 1: Reading resultCode"
            )

            val resultCode =
                intent.getIntExtra(
                    EXTRA_RESULT_CODE,
                    -1
                )

            Log.d(
                TAG,
                "STEP 2: resultCode = $resultCode"
            )

            if (resultCode != Activity.RESULT_OK) {

                Log.e(
                    TAG,
                    "ERROR: MediaProjection permission was not granted. resultCode=$resultCode"
                )

                stopSelf()

                return START_NOT_STICKY
            }

            // -------------------------------------------------
            // STEP 2 — Read MediaProjection data
            // -------------------------------------------------

            Log.d(
                TAG,
                "STEP 3: Reading MediaProjection data"
            )

            val data =
                IntentCompat.getParcelableExtra(
                    intent,
                    EXTRA_DATA,
                    Intent::class.java
                )

            Log.d(
                TAG,
                "STEP 4: projection data present = ${data != null}"
            )

            if (data == null) {

                Log.e(
                    TAG,
                    "ERROR: MediaProjection data is null"
                )

                stopSelf()

                return START_NOT_STICKY
            }

            // -------------------------------------------------
            // STEP 3 — Get MediaProjectionManager
            // -------------------------------------------------

            Log.d(
                TAG,
                "STEP 5: Getting MediaProjectionManager"
            )

            val mediaProjectionManager =
                getSystemService(
                    MEDIA_PROJECTION_SERVICE
                ) as MediaProjectionManager

            // -------------------------------------------------
            // STEP 4 — Create MediaProjection
            // -------------------------------------------------

            Log.d(
                TAG,
                "STEP 6: Requesting MediaProjection"
            )

            mediaProjection =
                mediaProjectionManager.getMediaProjection(
                    resultCode,
                    data
                )

            Log.d(
                TAG,
                "STEP 7: MediaProjection created = ${mediaProjection != null}"
            )

            if (mediaProjection == null) {

                Log.e(
                    TAG,
                    "ERROR: MediaProjection returned null"
                )

                stopSelf()

                return START_NOT_STICKY
            }

            // -------------------------------------------------
            // STEP 5 — Register callback
            // -------------------------------------------------

            Log.d(
                TAG,
                "STEP 8: Registering MediaProjection callback"
            )

            mediaProjection?.registerCallback(
                projectionCallback,
                mainHandler
            )

            Log.d(
                TAG,
                "STEP 9: MediaProjection callback registered"
            )

            // -------------------------------------------------
            // STEP 6 — Start capture
            // -------------------------------------------------

            Log.d(
                TAG,
                "STEP 10: Calling startCapture()"
            )

            startCapture()

            Log.d(
                TAG,
                "STEP 11: startCapture() returned successfully"
            )

            return START_NOT_STICKY

        } catch (e: Exception) {

            Log.e(
                TAG,
                "EXCEPTION in onStartCommand: ${e.javaClass.name}"
            )

            Log.e(
                TAG,
                "EXCEPTION MESSAGE: ${e.message}"
            )

            Log.e(
                TAG,
                "EXCEPTION STACKTRACE",
                e
            )

            cleanupAndStopService()

            return START_NOT_STICKY
        }
    }

    // ---------------------------------------------------------
    // Start screen capture
    // ---------------------------------------------------------

    private fun startCapture() {

        Log.d(
            TAG,
            "CAPTURE: startCapture() called"
        )

        try {

            if (mediaProjection == null) {

                Log.e(
                    TAG,
                    "CAPTURE ERROR: MediaProjection is null"
                )

                cleanupAndStopService()

                return
            }

            // -------------------------------------------------
            // Get screen dimensions
            // -------------------------------------------------

            val windowManager =
                getSystemService(
                    WINDOW_SERVICE
                ) as WindowManager

            val metrics =
                DisplayMetrics()

            @Suppress("DEPRECATION")
            windowManager.defaultDisplay.getRealMetrics(
                metrics
            )

            val width =
                metrics.widthPixels

            val height =
                metrics.heightPixels

            val density =
                metrics.densityDpi

            Log.d(
                TAG,
                "CAPTURE: width=$width height=$height density=$density"
            )

            if (width <= 0 || height <= 0) {

                Log.e(
                    TAG,
                    "CAPTURE ERROR: Invalid screen dimensions"
                )

                cleanupAndStopService()

                return
            }

            // -------------------------------------------------
            // Create ImageReader
            // -------------------------------------------------

            Log.d(
                TAG,
                "CAPTURE: Creating ImageReader"
            )

            imageReader =
                ImageReader.newInstance(
                    width,
                    height,
                    PixelFormat.RGBA_8888,
                    2
                )

            // -------------------------------------------------
            // Listen for screen frames
            // -------------------------------------------------

            imageReader?.setOnImageAvailableListener(
                { reader ->

                    Log.d(
                        TAG,
                        "CAPTURE: Image available"
                    )

                    try {

                        val image =
                            reader.acquireLatestImage()

                        if (image == null) {

                            Log.d(
                                TAG,
                                "CAPTURE: Image was null"
                            )

                            return@setOnImageAvailableListener
                        }

                        Log.d(
                            TAG,
                            "SUCCESS: Satya received a screen frame"
                        )

                        Log.d(
                            TAG,
                            "FRAME: width=${image.width} height=${image.height}"
                        )

                        // -------------------------------------------------
                        // Convert Image → Bitmap
                        // -------------------------------------------------

                        val bitmap =
                            imageToBitmap(image)

                        image.close()

                        if (bitmap == null) {

                            Log.e(
                                TAG,
                                "BITMAP: Failed to convert Image to Bitmap"
                            )

                            cleanupAndStopService()

                            return@setOnImageAvailableListener
                        }

                        Log.d(
                            TAG,
                            "BITMAP: Successfully created Bitmap"
                        )

                        Log.d(
                            TAG,
                            "BITMAP: width=${bitmap.width} height=${bitmap.height}"
                        )

                        // -------------------------------------------------
                        // Run OCR
                        // -------------------------------------------------

                        runOcr(bitmap)

                    } catch (e: Exception) {

                        Log.e(
                            TAG,
                            "FRAME ERROR: ${e.javaClass.name}"
                        )

                        Log.e(
                            TAG,
                            "FRAME ERROR MESSAGE: ${e.message}"
                        )

                        Log.e(
                            TAG,
                            "FRAME ERROR STACKTRACE",
                            e
                        )

                        cleanupAndStopService()
                    }

                },
                mainHandler
            )

            Log.d(
                TAG,
                "CAPTURE: ImageReader listener attached"
            )

            // -------------------------------------------------
            // Create VirtualDisplay
            // -------------------------------------------------

            Log.d(
                TAG,
                "CAPTURE: Creating VirtualDisplay"
            )

            virtualDisplay =
                mediaProjection?.createVirtualDisplay(
                    "SatyaScreenCapture",
                    width,
                    height,
                    density,
                    0,
                    imageReader?.surface,
                    null,
                    mainHandler
                )

            Log.d(
                TAG,
                "CAPTURE: VirtualDisplay created = ${virtualDisplay != null}"
            )

            if (virtualDisplay == null) {

                Log.e(
                    TAG,
                    "CAPTURE ERROR: VirtualDisplay is null"
                )

                cleanupAndStopService()

                return
            }

            Log.d(
                TAG,
                "CAPTURE: Screen capture is now active"
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "CAPTURE EXCEPTION: ${e.javaClass.name}"
            )

            Log.e(
                TAG,
                "CAPTURE EXCEPTION MESSAGE: ${e.message}"
            )

            Log.e(
                TAG,
                "CAPTURE EXCEPTION STACKTRACE",
                e
            )

            cleanupAndStopService()
        }
    }

    // ---------------------------------------------------------
    // Convert Image → Bitmap
    // ---------------------------------------------------------

    private fun imageToBitmap(
        image: android.media.Image
    ): Bitmap? {

        return try {

            val plane =
                image.planes[0]

            val buffer =
                plane.buffer

            val pixelStride =
                plane.pixelStride

            val rowStride =
                plane.rowStride

            val rowPadding =
                rowStride -
                        pixelStride * image.width

            val bitmapWidth =
                image.width +
                        rowPadding / pixelStride

            val bitmap =
                Bitmap.createBitmap(
                    bitmapWidth,
                    image.height,
                    Bitmap.Config.ARGB_8888
                )

            buffer.rewind()

            bitmap.copyPixelsFromBuffer(
                buffer
            )

            val croppedBitmap =
                Bitmap.createBitmap(
                    bitmap,
                    0,
                    0,
                    image.width,
                    image.height
                )

            bitmap.recycle()

            croppedBitmap

        } catch (e: Exception) {

            Log.e(
                TAG,
                "BITMAP ERROR: ${e.message}",
                e
            )

            null
        }
    }

    // ---------------------------------------------------------
    // OCR
    // ---------------------------------------------------------

    private fun runOcr(
        bitmap: Bitmap
    ) {

        if (ocrRunning) {

            Log.d(
                TAG,
                "OCR: Already running, ignoring frame"
            )

            bitmap.recycle()

            return
        }

        ocrRunning = true

        Log.d(
            TAG,
            "OCR: Starting text recognition"
        )

        try {

            val image =
                InputImage.fromBitmap(
                    bitmap,
                    0
                )

            val recognizer =
                TextRecognition.getClient(
                    TextRecognizerOptions.DEFAULT_OPTIONS
                )

            recognizer
                .process(image)
                .addOnSuccessListener { visionText ->

                    Log.d(
                        TAG,
                        "OCR: Text recognition successful"
                    )

                    val extractedText =
                        visionText.text.trim()

                    if (extractedText.isEmpty()) {

    Log.d(
        TAG,
        "OCR: No text detected"
    )

    ocrRunning = false

    recognizer.close()

    bitmap.recycle()

    cleanupAndStopService()

} else {

    Log.d(
        TAG,
        "OCR: Extracted text:"
    )

    Log.d(
        TAG,
        extractedText
    )

    recognizer.close()

    bitmap.recycle()

    ocrRunning = false

    submitVerification(
        extractedText
    )
}

                    ocrRunning = false

                    recognizer.close()

                    bitmap.recycle()

                }
                .addOnFailureListener { exception ->

                    Log.e(
                        TAG,
                        "OCR ERROR: ${exception.javaClass.name}"
                    )

                    Log.e(
                        TAG,
                        "OCR ERROR MESSAGE: ${exception.message}"
                    )

                    Log.e(
                        TAG,
                        "OCR ERROR STACKTRACE",
                        exception
                    )

                    ocrRunning = false

                    recognizer.close()

                    bitmap.recycle()

                    cleanupAndStopService()
                }

        } catch (e: Exception) {

            Log.e(
                TAG,
                "OCR EXCEPTION: ${e.javaClass.name}"
            )

            Log.e(
                TAG,
                "OCR EXCEPTION MESSAGE: ${e.message}"
            )

            Log.e(
                TAG,
                "OCR EXCEPTION STACKTRACE",
                e
            )

            ocrRunning = false

            bitmap.recycle()

            cleanupAndStopService()
        }
    }

    // ---------------------------------------------------------
    // Cleanup
    // ---------------------------------------------------------

    private fun cleanupAndStopService() {

        Log.d(
            TAG,
            "CLEANUP: Starting cleanup"
        )

        try {

            virtualDisplay?.release()

            virtualDisplay = null

            Log.d(
                TAG,
                "CLEANUP: VirtualDisplay released"
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "CLEANUP: VirtualDisplay release failed",
                e
            )
        }

        try {

            imageReader?.setOnImageAvailableListener(
                null,
                null
            )

            imageReader?.close()

            imageReader = null

            Log.d(
                TAG,
                "CLEANUP: ImageReader released"
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "CLEANUP: ImageReader release failed",
                e
            )
        }

        try {

            mediaProjection?.unregisterCallback(
                projectionCallback
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "CLEANUP: Callback unregister failed",
                e
            )
        }

        try {

            mediaProjection?.stop()

            mediaProjection = null

            Log.d(
                TAG,
                "CLEANUP: MediaProjection stopped"
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "CLEANUP: MediaProjection stop failed",
                e
            )
        }

        try {

            ServiceCompat.stopForeground(
                this,
                ServiceCompat.STOP_FOREGROUND_REMOVE
            )

        } catch (e: Exception) {

            Log.e(
                TAG,
                "CLEANUP: Foreground service stop failed",
                e
            )
        }

        Log.d(
            TAG,
            "CLEANUP: Stopping Satya capture service"
        )

        stopSelf()
    }

    // ---------------------------------------------------------
    // Notification channel
    // ---------------------------------------------------------

    private fun createNotificationChannel() {

        val channel =
            NotificationChannel(
                CHANNEL_ID,
                "Satya Screen Verification",
                NotificationManager.IMPORTANCE_LOW
            )

        val notificationManager =
            getSystemService(
                NotificationManager::class.java
            )

        notificationManager?.createNotificationChannel(
            channel
        )
    }

    // ---------------------------------------------------------
    // Foreground notification
    // ---------------------------------------------------------

    private fun createNotification(): Notification {

        return Notification.Builder(
            this,
            CHANNEL_ID
        )
            .setContentTitle("Satya")
            .setContentText(
                "Verifying your screen"
            )
            .setSmallIcon(
                android.R.drawable.ic_menu_view
            )
            .setOngoing(true)
            .build()
    }

    private fun submitVerification(
    text: String
) {

    Log.d(
        TAG,
        "API: Sending OCR text to Satya backend"
    )

    serviceScope.launch {

        try {

            val response =
                RetrofitClient.api.createVerification(
                    VerificationRequest(
                        text = text
                    )
                )

            Log.d(
                TAG,
                "API: Verification request created"
            )

            
Log.d(
    TAG,
    "API: Verification ID = ${response.data.verificationId}"
)

Log.d(
    TAG,
    "API: Extracted text = ${response.data.extractedText}"
)

Log.d(
    TAG,
    "API: Claims returned = ${response.data.results.size}"
)

response.data.results.forEachIndexed { index, result ->
    Log.d(
        TAG,
        "API: Claim ${index + 1} = ${result.claim.orEmpty()}"
    )

    Log.d(
        TAG,
        "API: Assessment = ${result.assessment?.assessment ?: "UNAVAILABLE"}"
    )

    Log.d(
        TAG,
        "API: Explanation = ${result.assessment?.explanation.orEmpty()}"
    )
}


            cleanupAndStopService()

        } catch (e: Exception) {

            Log.e(
                TAG,
                "API ERROR: ${e.javaClass.name}"
            )

            Log.e(
                TAG,
                "API ERROR MESSAGE: ${e.message}"
            )

            Log.e(
                TAG,
                "API ERROR STACKTRACE",
                e
            )

            cleanupAndStopService()
        }
    }
}
    // ---------------------------------------------------------
    // Service destruction
    // ---------------------------------------------------------

    override fun onDestroy() {

        Log.d(
            TAG,
            "SERVICE: onDestroy()"
        )

        virtualDisplay?.release()

        serviceScope.cancel()

        virtualDisplay = null

        imageReader?.close()

        imageReader = null

        mediaProjection = null

        super.onDestroy()
    }

    override fun onBind(
        intent: Intent?
    ): IBinder? {

        return null
    }
}