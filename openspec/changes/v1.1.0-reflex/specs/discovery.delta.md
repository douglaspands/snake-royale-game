# OpenSpec Delta: LAN IP Discovery & Cross-Device Access Banner
**Domain:** `distribution`  
**Change ID:** `v1.1.0-reflex`  

---

## 1. Requirements

### REQ-DIST-002: Automatic LAN IP Discovery & Terminal Connection Banner
When the server application starts up, the backend MUST automatically:
1. Probe local network interfaces to discover active LAN IPv4 addresses (Wi-Fi / Ethernet).
2. Print and log a high-contrast startup banner displaying:
   - Local access URL: `http://localhost:<PORT>`
   - Network access URL(s): `http://<LAN_IP>:<PORT>`
   - Explicit instructions for mobile/tablet connection on the same Wi-Fi router.

---

## 2. Behavioral Scenarios

### Scenario: Startup with Wi-Fi network interface
- **GIVEN** a machine with active Wi-Fi IP `192.168.1.105`
- **WHEN** the user executes `uv run uvicorn server.app.main:app --host 0.0.0.0 --port 8000`
- **THEN** the startup banner prints `http://192.168.1.105:8000` on stdout during lifespan initialization.
