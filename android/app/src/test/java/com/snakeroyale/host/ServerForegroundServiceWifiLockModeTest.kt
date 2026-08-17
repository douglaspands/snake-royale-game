package com.snakeroyale.host

import android.net.wifi.WifiManager
import android.os.Build
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Regression test for the "URL unreachable from other devices" bug (REQ-AND-005):
 * WIFI_MODE_FULL_HIGH_PERF is a documented no-op from API 29 onward, so the Wi-Fi radio
 * was free to enter power-save even while the lock was "held".
 */
class ServerForegroundServiceWifiLockModeTest {

    @Test
    fun `uses the deprecated high-perf mode below API 29`() {
        assertEquals(
            WifiManager.WIFI_MODE_FULL_HIGH_PERF,
            ServerForegroundService.resolveWifiLockMode(Build.VERSION_CODES.P),
        )
    }

    @Test
    fun `switches to low-latency mode on API 29`() {
        assertEquals(
            WifiManager.WIFI_MODE_FULL_LOW_LATENCY,
            ServerForegroundService.resolveWifiLockMode(Build.VERSION_CODES.Q),
        )
    }

    @Test
    fun `stays on low-latency mode on newer API levels`() {
        assertEquals(
            WifiManager.WIFI_MODE_FULL_LOW_LATENCY,
            ServerForegroundService.resolveWifiLockMode(34),
        )
    }
}
