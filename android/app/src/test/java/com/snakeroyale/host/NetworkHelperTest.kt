package com.snakeroyale.host

import org.junit.Assert.assertEquals
import org.junit.Test

class NetworkHelperTest {

    @Test
    fun `excludes down and loopback interfaces`() {
        val candidates = listOf(
            NetworkAddressCandidate("wlan0", isUp = false, isLoopback = false, ipv4Address = "192.168.1.10"),
            NetworkAddressCandidate("lo", isUp = true, isLoopback = true, ipv4Address = "127.0.0.1"),
        )

        assertEquals(emptyList<String>(), NetworkHelper.selectLocalIpAddresses(candidates))
    }

    @Test
    fun `excludes loopback and link-local addresses even on an up non-loopback interface`() {
        val candidates = listOf(
            NetworkAddressCandidate("eth0", isUp = true, isLoopback = false, ipv4Address = "127.0.0.5"),
            NetworkAddressCandidate("wlan0", isUp = true, isLoopback = false, ipv4Address = "169.254.1.2"),
        )

        assertEquals(emptyList<String>(), NetworkHelper.selectLocalIpAddresses(candidates))
    }

    @Test
    fun `prioritizes wlan, ap and eth interfaces to the front`() {
        val candidates = listOf(
            NetworkAddressCandidate("tun0", isUp = true, isLoopback = false, ipv4Address = "10.0.0.5"),
            NetworkAddressCandidate("wlan0", isUp = true, isLoopback = false, ipv4Address = "192.168.1.20"),
        )

        assertEquals(listOf("192.168.1.20", "10.0.0.5"), NetworkHelper.selectLocalIpAddresses(candidates))
    }

    @Test
    fun `deduplicates repeated addresses`() {
        val candidates = listOf(
            NetworkAddressCandidate("wlan0", isUp = true, isLoopback = false, ipv4Address = "192.168.1.20"),
            NetworkAddressCandidate("ap0", isUp = true, isLoopback = false, ipv4Address = "192.168.1.20"),
        )

        assertEquals(listOf("192.168.1.20"), NetworkHelper.selectLocalIpAddresses(candidates))
    }

    @Test
    fun `returns empty list when there are no candidates`() {
        assertEquals(emptyList<String>(), NetworkHelper.selectLocalIpAddresses(emptyList()))
    }

    @Test
    fun `buildServerUrl uses the first ip when the list is non-empty`() {
        assertEquals(
            "http://192.168.1.20:8000",
            NetworkHelper.buildServerUrl(listOf("192.168.1.20", "10.0.0.5"), 8000),
        )
    }

    @Test
    fun `buildServerUrl falls back to localhost when the list is empty`() {
        assertEquals("http://localhost:8000", NetworkHelper.buildServerUrl(emptyList(), 8000))
    }
}
