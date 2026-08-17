package com.snakeroyale.host

import android.Manifest
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.rule.GrantPermissionRule
import java.net.HttpURLConnection
import java.net.URL
import org.junit.After
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Closest automated guard for the "URL unreachable from other devices" bug class
 * (REQ-AND-005): starts the real embedded server and confirms /health answers not just on
 * localhost but also on the device's own non-loopback LAN address, i.e. that the socket
 * really accepts traffic on the wildcard bind and not only loopback. A single emulator
 * can't fully stand in for a second physical device on the network, but a bind-only-to-
 * loopback regression would fail this even without one.
 */
@RunWith(AndroidJUnit4::class)
class ServerForegroundServiceInstrumentedTest {

    @get:Rule
    val notificationPermissionRule: GrantPermissionRule =
        GrantPermissionRule.grant(Manifest.permission.POST_NOTIFICATIONS)

    private val port = 8000
    private val context get() = InstrumentationRegistry.getInstrumentation().targetContext

    @After
    fun tearDown() {
        ServerForegroundService.stopService(context)
    }

    @Test
    fun serverBecomesReachableOnLocalhostAndOnItsOwnLanAddress() {
        ServerForegroundService.startService(context, port)

        assertTrue(
            "Server never answered /health on localhost",
            pollHealth("http://localhost:$port/health"),
        )

        val lanUrl = NetworkHelper.getPrimaryServerUrl(port)
        if (QRCodeHelper.isReachableByPeers(lanUrl)) {
            assertTrue(
                "Server never answered /health on its own LAN address ($lanUrl/health) -- " +
                    "this is the exact class of bug where the socket only accepts loopback traffic",
                pollHealth("$lanUrl/health"),
            )
        }
    }

    private fun pollHealth(url: String, attempts: Int = 20, delayMs: Long = 500L): Boolean {
        repeat(attempts) { attempt ->
            if (attempt > 0) Thread.sleep(delayMs)
            if (probeHealth(url)) return true
        }
        return false
    }

    private fun probeHealth(url: String): Boolean = try {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 1500
            readTimeout = 1500
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
}
