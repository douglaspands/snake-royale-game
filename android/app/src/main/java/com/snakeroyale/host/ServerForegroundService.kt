package com.snakeroyale.host

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform

class ServerForegroundService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null
    private var isServerActive = false

    companion object {
        const val CHANNEL_ID = "snake_server_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.snakeroyale.host.ACTION_START"
        const val ACTION_STOP = "com.snakeroyale.host.ACTION_STOP"
        const val EXTRA_PORT = "EXTRA_PORT"

        fun startService(context: Context, port: Int = 8000) {
            val intent = Intent(context, ServerForegroundService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_PORT, port)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, ServerForegroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        acquireLocks()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            stopServerInternal()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }

        val port = intent?.getIntExtra(EXTRA_PORT, 8000) ?: 8000
        startServerInternal(port)

        val notification = buildNotification(port)
        startForeground(NOTIFICATION_ID, notification)

        return START_STICKY
    }

    private fun startServerInternal(port: Int) {
        if (isServerActive) return

        try {
            if (!Python.isStarted()) {
                Python.start(AndroidPlatform(this))
            }
            val py = Python.getInstance()
            val entry = py.getModule("android_entry")
            val lanUrl = NetworkHelper.getPrimaryServerUrl(port)
            val ipOnly = lanUrl.removePrefix("http://").substringBefore(":")

            // Extract assets or pass path if available
            val staticDir = "${filesDir.absolutePath}/client_dist"

            entry.callAttr("start_server", "0.0.0.0", port, staticDir, ipOnly)
            isServerActive = true
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopServerInternal() {
        if (!isServerActive) return

        try {
            if (Python.isStarted()) {
                val py = Python.getInstance()
                val entry = py.getModule("android_entry")
                entry.callAttr("stop_server")
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            isServerActive = false
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Snake Battle Royale Server",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Executa o servidor do jogo em segundo plano"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(port: Int): Notification {
        val serverUrl = NetworkHelper.getPrimaryServerUrl(port)

        // Open Dashboard Intent
        val mainIntent = Intent(this, MainActivity::class.java)
        val mainPendingIntent = PendingIntent.getActivity(
            this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Open Browser Intent
        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("http://localhost:$port"))
        val browserPendingIntent = PendingIntent.getActivity(
            this, 1, browserIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Stop Service Intent
        val stopIntent = Intent(this, ServerForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 2, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("🐍 Snake Royale — Servidor Online")
            .setContentText("Acesse: $serverUrl (Porta $port)")
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(mainPendingIntent)
            .setOngoing(true)
            .addAction(android.R.drawable.ic_menu_view, "Jogar no Navegador", browserPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Parar Servidor", stopPendingIntent)
            .build()
    }

    @Suppress("DEPRECATION")
    private fun acquireLocks() {
        try {
            val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = powerManager.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK,
                "SnakeRoyale::ServerWakeLock"
            ).apply {
                acquire(10 * 60 * 1000L /* 10 minutes timeout refresh */)
            }

            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            wifiLock = wifiManager.createWifiLock(
                WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                "SnakeRoyale::ServerWifiLock"
            ).apply {
                acquire()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        stopServerInternal()
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
            if (wifiLock?.isHeld == true) wifiLock?.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }
        super.onDestroy()
    }
}
