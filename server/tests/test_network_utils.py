"""
Unit tests for LAN IP discovery and startup banner generation.
"""

from unittest.mock import patch

from server.app.network_utils import (
    format_startup_banner,
    get_local_ip_addresses,
    get_network_endpoints,
    log_startup_banner,
)


def test_get_local_ip_addresses_returns_list():
    ips = get_local_ip_addresses()
    assert isinstance(ips, list)
    for ip in ips:
        assert isinstance(ip, str)
        assert not ip.startswith("127.")


def test_get_network_endpoints():
    endpoints = get_network_endpoints(port=8080)
    assert endpoints.local_url == "http://localhost:8080"
    assert isinstance(endpoints.network_urls, list)
    for url in endpoints.network_urls:
        assert ":8080" in url
        assert url.startswith("http://")


def test_format_startup_banner_with_detected_ip():
    with patch("server.app.network_utils.get_local_ip_addresses", return_value=["192.168.1.50"]):
        banner = format_startup_banner(port=8000)
        assert "http://localhost:8000" in banner
        assert "http://192.168.1.50:8000" in banner
        assert "Wi-Fi / LAN Access" in banner
        assert "Dica para celular/tablet" in banner


def test_format_startup_banner_no_ips_fallback():
    with patch("server.app.network_utils.get_local_ip_addresses", return_value=[]):
        banner = format_startup_banner(port=8000)
        assert "http://localhost:8000" in banner
        assert "(Nenhum IP de rede detectado)" in banner


def test_log_startup_banner_prints_output(capsys):
    with patch("server.app.network_utils.get_local_ip_addresses", return_value=["10.0.0.15"]):
        log_startup_banner(port=8000)
        captured = capsys.readouterr()
        assert "SNAKE BATTLE ROYALE MULTIPLAYER" in captured.out
        assert "http://10.0.0.15:8000" in captured.out
