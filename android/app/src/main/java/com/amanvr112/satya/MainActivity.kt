package com.amanvr112.satya

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.amanvr112.satya.capture.ScreenCaptureService
import com.amanvr112.satya.ui.theme.SatyaTheme


class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            SatyaTheme {
                SatyaCaptureScreen()
            }
        }
    }

    @Composable
    private fun SatyaCaptureScreen() {

        var status by remember {
            mutableStateOf("Ready to verify")
        }

        val mediaProjectionManager =
            getSystemService(
                MEDIA_PROJECTION_SERVICE
            ) as MediaProjectionManager

        val captureLauncher =
            rememberLauncherForActivityResult(
                contract = ActivityResultContracts.StartActivityForResult()
            ) { result ->

                if (
                    result.resultCode == Activity.RESULT_OK &&
                    result.data != null
                ) {

                    status = "Screen access approved"

                    val serviceIntent = Intent(
                        this@MainActivity,
                        ScreenCaptureService::class.java
                    ).apply {
                        putExtra(
                            "resultCode",
                            result.resultCode
                        )

                        putExtra(
                            "data",
                            result.data
                        )
                    }

                    startForegroundService(serviceIntent)

                } else {
                    status = "Screen access cancelled"
                }
            }

        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {

            Text(
                text = "Satya"
            )

            Button(
                onClick = {
                    status = "Requesting screen access..."

                    val captureIntent =
                        mediaProjectionManager.createScreenCaptureIntent()

                    captureLauncher.launch(captureIntent)
                }
            ) {
                Text("Verify with Satya")
            }

            Text(
                text = status
            )
        }
    }
}