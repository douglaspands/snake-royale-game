package com.snakeroyale.host

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.widget.SwitchCompat
import androidx.core.content.ContextCompat
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {

    private companion object {
        const val HEALTH_RETRIES = 20
        const val HEALTH_RETRY_DELAY_MS = 500L
        const val HEALTH_TIMEOUT_MS = 1500
    }

    private lateinit var tvServerStatus: TextView
    private lateinit var switchServer: SwitchCompat
    private lateinit var tvLanIpAddress: TextView
    private lateinit var ivQrCode: ImageView
    private lateinit var btnCopyIp: Button
    private lateinit var btnPlayBrowser: Button
    private lateinit var btnPlayApp: Button
    private lateinit var btnShare: Button

    private val serverPort = 8000
    private var isServerRunning = false

    // Guards the switch listener against the programmatic writes below: assigning
    // isChecked fires onCheckedChanged, which would re-enter startServer/stopServer.
    private var updatingSwitch = false

    private val requestNotificationPermission =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) { _ ->
            // Service can still start even if permission is denied, but notification will be silent
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        setupListeners()
        checkPermissions()
        refreshNetworkInfo()
        startServer()
    }

    override fun onResume() {
        super.onResume()
        refreshNetworkInfo()
    }

    private fun initViews() {
        tvServerStatus = findViewById(R.id.tvServerStatus)
        switchServer = findViewById(R.id.switchServer)
        tvLanIpAddress = findViewById(R.id.tvLanIpAddress)
        ivQrCode = findViewById(R.id.ivQrCode)
        btnCopyIp = findViewById(R.id.btnCopyIp)
        btnPlayBrowser = findViewById(R.id.btnPlayBrowser)
        btnPlayApp = findViewById(R.id.btnPlayApp)
        btnShare = findViewById(R.id.btnShare)
    }

    private fun setupListeners() {
        switchServer.setOnCheckedChangeListener { _, isChecked ->
            if (updatingSwitch) return@setOnCheckedChangeListener
            if (isChecked) {
                startServer()
            } else {
                stopServer()
            }
        }

        btnCopyIp.setOnClickListener {
            val url = tvLanIpAddress.text.toString()
            copyToClipboard(url)
        }

        btnPlayBrowser.setOnClickListener {
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("http://localhost:$serverPort"))
            startActivity(browserIntent)
        }

        btnPlayApp.setOnClickListener {
            val appIntent = Intent(this, GameWebViewActivity::class.java).apply {
                putExtra(GameWebViewActivity.EXTRA_URL, "http://localhost:$serverPort")
            }
            startActivity(appIntent)
        }

        btnShare.setOnClickListener {
            val url = tvLanIpAddress.text.toString()
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_SUBJECT, "🐍 Jogue Snake Battle Royale Comigo!")
                putExtra(Intent.EXTRA_TEXT, "Entre na partida de Snake Battle Royale na mesma rede Wi-Fi acessando:\n$url")
            }
            startActivity(Intent.createChooser(shareIntent, "Compartilhar Link da Partida"))
        }
    }

    private fun refreshNetworkInfo() {
        val serverUrl = NetworkHelper.getPrimaryServerUrl(serverPort)
        tvLanIpAddress.text = serverUrl

        try {
            val qrBitmap = QRCodeHelper.generateQRCodeBitmap(serverUrl, size = 512)
            ivQrCode.setImageBitmap(qrBitmap)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun startServer() {
        ServerForegroundService.startService(this, serverPort)
        setSwitchChecked(true)
        tvServerStatus.text = getString(R.string.status_starting)
        tvServerStatus.setTextColor(ContextCompat.getColor(this, R.color.status_starting))

        // startForegroundService returns before the service has done anything, and the
        // Python server then starts on a further thread inside it. There is no return
        // value meaning "the server is up", so the status is set from an actual
        // observation of /health rather than from the fact that a start was requested.
        // /health is independent of the static assets, so it distinguishes "server
        // down" from "server up but serving nothing". See REQ-AND-010.
        Thread({ awaitServerHealthy() }, "SnakeHealthProbe").start()
    }

    private fun awaitServerHealthy() {
        val healthy = (1..HEALTH_RETRIES).any { attempt ->
            if (attempt > 1) Thread.sleep(HEALTH_RETRY_DELAY_MS)
            probeHealth()
        }
        runOnUiThread {
            isServerRunning = healthy
            if (healthy) {
                tvServerStatus.text = getString(R.string.status_online)
                tvServerStatus.setTextColor(ContextCompat.getColor(this, R.color.status_online))
            } else {
                tvServerStatus.text = ServerForegroundService.lastError
                    ?.let { getString(R.string.status_failed_reason, it) }
                    ?: getString(R.string.status_offline)
                tvServerStatus.setTextColor(ContextCompat.getColor(this, R.color.status_offline))
                setSwitchChecked(false)
            }
        }
    }

    private fun setSwitchChecked(checked: Boolean) {
        updatingSwitch = true
        switchServer.isChecked = checked
        updatingSwitch = false
    }

    private fun probeHealth(): Boolean = try {
        val connection = (URL("http://localhost:$serverPort/health").openConnection() as HttpURLConnection).apply {
            connectTimeout = HEALTH_TIMEOUT_MS
            readTimeout = HEALTH_TIMEOUT_MS
            requestMethod = "GET"
        }
        try {
            connection.responseCode == 200
        } finally {
            connection.disconnect()
        }
    } catch (e: Exception) {
        false
    }

    private fun stopServer() {
        ServerForegroundService.stopService(this)
        isServerRunning = false
        tvServerStatus.text = getString(R.string.status_offline)
        tvServerStatus.setTextColor(ContextCompat.getColor(this, R.color.status_offline))
        setSwitchChecked(false)
    }

    private fun copyToClipboard(text: String) {
        val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Snake Server URL", text)
        clipboard.setPrimaryClip(clip)
        Toast.makeText(this, R.string.copied_toast, Toast.LENGTH_SHORT).show()
    }

    private fun checkPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                requestNotificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}
