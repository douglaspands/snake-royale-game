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
import android.util.Log
import androidx.core.app.NotificationCompat
import com.chaquo.python.Python
import com.chaquo.python.android.AndroidPlatform

class ServerForegroundService : Service() {

    private var wakeLock: PowerManager.WakeLock? = null
    private var wifiLock: WifiManager.WifiLock? = null

    // Written from the bootstrap thread, read from the main thread on stop.
    @Volatile
    private var isServerActive = false

    companion object {
        const val TAG = "SnakeServerService"
        const val CHANNEL_ID = "snake_server_channel"

        /** Reason for the most recent startup failure, or null if the last start succeeded. */
        @Volatile
        var lastError: String? = null
            internal set

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

        // startForeground must be reached within a few seconds of
        // startForegroundService or Android 12+ kills the service with
        // ForegroundServiceDidNotStartInTimeException. Asset extraction and
        // Python.start() are both slow enough to blow that budget on a cold start,
        // so the notification goes up first and the startup runs off the main thread.
        startForeground(NOTIFICATION_ID, buildNotification(port))

        Thread({ startServerInternal(port) }, "SnakeServerBootstrap").start()

        return START_STICKY
    }

    private fun startServerInternal(port: Int): Boolean {
        if (isServerActive) return true

        try {
            // The SPA ships inside the APK under assets/client_dist, which is not a
            // filesystem path. Extract it before handing the path to Python, which
            // serves it through Starlette's FileResponse. See REQ-AND-003.
            val versionCode = packageManager
                .getPackageInfo(packageName, 0)
                .let { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) it.longVersionCode.toInt() else @Suppress("DEPRECATION") it.versionCode }
            val assets = AssetExtractor.extract(this, "client_dist", versionCode)
            if (assets.fileCount == 0) {
                Log.e(TAG, "No SPA assets extracted; the server would serve a blank page")
            }

            if (!Python.isStarted()) {
                Python.start(AndroidPlatform(this))
            }
            val py = Python.getInstance()
            val entry = py.getModule("android_entry")
            val lanUrl = NetworkHelper.getPrimaryServerUrl(port)
            val ipOnly = lanUrl.removePrefix("http://").substringBefore(":")

            entry.callAttr("start_server", "0.0.0.0", port, assets.dir.absolutePath, ipOnly)
            isServerActive = true
            lastError = null
            Log.i(TAG, "Embedded server start requested on 0.0.0.0:$port (static=${assets.dir})")
            return true
        } catch (e: Exception) {
            // Previously this swallowed the exception into a bare stack trace, which
            // is why three releases shipped with the server broken and the dashboard
            // still reporting "Online". See REQ-AND-010.
            lastError = e.message ?: e::class.java.simpleName
            Log.e(TAG, "Failed to start the embedded server on port $port", e)
            isServerActive = false
            return false
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
            Log.e(TAG, "Failed to stop the embedded server cleanly", e)
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
                // No timeout: a fixed-duration acquire() silently lapses after its
                // window, letting the device resume CPU throttling mid-session
                // (REQ-AND-005). onDestroy() below unconditionally releases this
                // lock when the service stops, so an indefinite hold has no
                // corresponding leak risk.
                acquire()
            }

            val wifiManager = applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            wifiLock = wifiManager.createWifiLock(
                WifiManager.WIFI_MODE_FULL_HIGH_PERF,
                "SnakeRoyale::ServerWifiLock"
            ).apply {
                acquire()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to acquire wake/wifi locks", e)
        }
    }

    override fun onDestroy() {
        stopServerInternal()
        try {
            if (wakeLock?.isHeld == true) wakeLock?.release()
            if (wifiLock?.isHeld == true) wifiLock?.release()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to release wake/wifi locks", e)
        }
        super.onDestroy()
    }
}
