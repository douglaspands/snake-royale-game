"""
Network utilities for discovering local LAN IP addresses and displaying
interactive multiplayer connection banners.
"""

import logging
import os
import socket
from typing import NamedTuple

logger = logging.getLogger("server.network")


class NetworkEndpoints(NamedTuple):
    local_url: str
    network_urls: list[str]


def get_local_ip_addresses() -> list[str]:
    """
    Discovers active IPv4 addresses on local network interfaces (Wi-Fi / Ethernet / Hotspot),
    excluding loopback addresses. Supports environment override via SNAKE_HOST_IP.
    """
    ip_list: list[str] = []

    # 0. Environment variable override (e.g. passed from Android native layer)
    env_ip = os.environ.get("SNAKE_HOST_IP") or os.environ.get("HOST_IP")
    if env_ip and env_ip != "127.0.0.1" and not env_ip.startswith("127."):
        ip_list.append(env_ip)

    # 1. Primary route discovery via outbound UDP socket probes
    probe_targets = [("8.8.8.8", 80), ("1.1.1.1", 80)]
    for target in probe_targets:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.settimeout(0.5)
                s.connect(target)
                primary_ip = s.getsockname()[0]
                if primary_ip and primary_ip != "127.0.0.1" and primary_ip not in ip_list:
                    ip_list.append(primary_ip)
                    break
        except Exception:
            continue

    # 2. Hostname resolution fallback
    try:
        hostname = socket.gethostname()
        for addr_info in socket.getaddrinfo(hostname, None, socket.AF_INET):
            sock_addr = addr_info[4]
            if sock_addr and len(sock_addr) > 0:
                ip = str(sock_addr[0])
                if ip and not ip.startswith("127.") and ip not in ip_list:
                    ip_list.append(ip)
    except Exception:
        pass

    return ip_list


def get_network_endpoints(port: int = 8000) -> NetworkEndpoints:
    """Returns local and LAN endpoints for the server."""
    local_url = f"http://localhost:{port}"
    lan_ips = get_local_ip_addresses()
    network_urls = [f"http://{ip}:{port}" for ip in lan_ips]
    return NetworkEndpoints(local_url=local_url, network_urls=network_urls)


def format_startup_banner(port: int = 8000) -> str:
    """
    Generates an aesthetic terminal startup banner with LAN IP addresses
    for cross-device mobile/tablet access on the same router.
    """
    endpoints = get_network_endpoints(port)

    lines = [
        "",
        "=======================================================================",
        "  🐍 SNAKE BATTLE ROYALE MULTIPLAYER — SERVER ONLINE (v1.1.0-REFLEX)",
        "=======================================================================",
        f"  💻 Local Access:      {endpoints.local_url}",
    ]

    if endpoints.network_urls:
        for idx, net_url in enumerate(endpoints.network_urls):
            label = "📱 Wi-Fi / LAN Access:" if idx == 0 else "                      "
            lines.append(f"  {label} {net_url}")
        lines.append("")
        lines.append("  💡 Dica para celular/tablet: Conecte no mesmo Wi-Fi e abra")
        lines.append(f"     o link acima ({endpoints.network_urls[0]}) no navegador mobile!")
    else:
        lines.append("  📱 Wi-Fi / LAN Access: (Nenhum IP de rede detectado)")

    lines.append("=======================================================================")
    lines.append("")

    return "\n".join(lines)


def log_startup_banner(port: int = 8000) -> None:
    """Prints and logs the startup banner."""
    banner = format_startup_banner(port)
    print(banner)
    logger.info(f"Server accessible at local: http://localhost:{port}")
