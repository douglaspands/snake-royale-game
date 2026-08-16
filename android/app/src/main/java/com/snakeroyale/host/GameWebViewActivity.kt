package com.snakeroyale.host

import android.annotation.SuppressLint
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageButton
import androidx.appcompat.app.AppCompatActivity

class GameWebViewActivity : AppCompatActivity() {

    private lateinit var gameWebView: WebView
    private lateinit var btnExitGame: ImageButton

    companion object {
        const val EXTRA_URL = "EXTRA_URL"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Follows the sensor across all four orientations. `unspecified` defers to
        // per-app display settings that vary by OEM, and `user` would deny landscape
        // to a player who has auto-rotate locked. See REQ-AND-004.
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
        setContentView(R.layout.activity_game_webview)

        hideSystemUI()

        gameWebView = findViewById(R.id.gameWebView)
        btnExitGame = findViewById(R.id.btnExitGame)

        val targetUrl = intent.getStringExtra(EXTRA_URL) ?: "http://localhost:8000"

        setupWebView(targetUrl)

        btnExitGame.setOnClickListener {
            finish()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView(url: String) {
        gameWebView.apply {
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                databaseEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                // The bundled SPA already declares its own
                // `width=device-width, initial-scale=1.0` viewport meta tag. Enabling
                // useWideViewPort emulates a wide desktop layout viewport, and pairing
                // it with loadWithOverviewMode then zooms the whole page out to fit
                // that emulated width -- shrinking the game and leaving a margin
                // around it, unlike the same URL rendered in the system browser.
                // Leaving both off honours the page's own viewport at scale 1.0.
                // See REQ-AND-004.
                loadWithOverviewMode = false
                useWideViewPort = false
                setSupportZoom(false)
                displayZoomControls = false
                mediaPlaybackRequiresUserGesture = false
            }

            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                }
            }

            webChromeClient = WebChromeClient()
            loadUrl(url)
        }
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior =
                    WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    // configChanges keeps the activity alive across rotation -- which is what preserves
    // the WebView and its WebSocket session -- but that also means onCreate does not run
    // again, so the immersive flags are re-applied here. See REQ-AND-004.
    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        hideSystemUI()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUI()
    }

    override fun onDestroy() {
        gameWebView.apply {
            stopLoading()
            loadUrl("about:blank")
            clearHistory()
            removeAllViews()
            destroy()
        }
        super.onDestroy()
    }
}
