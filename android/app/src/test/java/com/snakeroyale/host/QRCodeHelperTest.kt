package com.snakeroyale.host

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class QRCodeHelperTest {

    @Test
    fun `rejects localhost`() {
        assertFalse(QRCodeHelper.isReachableByPeers("http://localhost:8000"))
    }

    @Test
    fun `rejects loopback addresses`() {
        assertFalse(QRCodeHelper.isReachableByPeers("http://127.0.0.1:8000"))
    }

    @Test
    fun `rejects the wildcard bind address`() {
        assertFalse(QRCodeHelper.isReachableByPeers("http://0.0.0.0:8000"))
    }

    @Test
    fun `rejects the IPv6 loopback address`() {
        assertFalse(QRCodeHelper.isReachableByPeers("http://::1:8000"))
    }

    @Test
    fun `rejects an empty host`() {
        assertFalse(QRCodeHelper.isReachableByPeers("http://:8000"))
    }

    @Test
    fun `accepts a real LAN address`() {
        assertTrue(QRCodeHelper.isReachableByPeers("http://192.168.1.50:8000"))
    }
}
