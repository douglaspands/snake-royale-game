package com.snakeroyale.host

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections

object NetworkHelper {

    /**
     * Discovers active local IPv4 addresses on Wi-Fi, Hotspot, and LAN network interfaces.
     */
    fun getLocalIpAddresses(): List<String> {
        val ipList = mutableListOf<String>()

        try {
            val interfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
            for (intf in interfaces) {
                if (!intf.isUp || intf.isLoopback) continue

                val addrs = Collections.list(intf.inetAddresses)
                for (addr in addrs) {
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        val hostAddress = addr.hostAddress ?: continue
                        if (!hostAddress.startsWith("127.") && !hostAddress.startsWith("169.254.")) {
                            // Prioritize wlan/ap interfaces
                            if (intf.name.startsWith("wlan") || intf.name.startsWith("ap") || intf.name.startsWith("eth")) {
                                ipList.add(0, hostAddress)
                            } else {
                                ipList.add(hostAddress)
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }

        return ipList.distinct()
    }

    /**
     * Returns primary LAN endpoint URL (e.g. "http://192.168.1.100:8000") or localhost fallback.
     */
    fun getPrimaryServerUrl(port: Int = 8000): String {
        val ips = getLocalIpAddresses()
        return if (ips.isNotEmpty()) {
            "http://${ips.first()}:$port"
        } else {
            "http://localhost:$port"
        }
    }

    /**
     * Checks if the device is currently connected to Wi-Fi.
     */
    fun isWifiConnected(context: Context): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
        val activeNetwork = cm.activeNetwork ?: return false
        val capabilities = cm.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
    }
}
