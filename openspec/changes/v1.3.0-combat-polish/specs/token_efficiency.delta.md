# Token Efficiency Delta Specification: v1.3.0-COMBAT-POLISH

## 1. Requirements

### REQ-TOKN-001: Workspace Ingestion Filtering
- The repository SHALL maintain `.ignore` and `.antigravityignore` files excluding `client/dist/`, `.venv/`, `node_modules/`, caches, and binary dumps from AI tool scans.

### REQ-TOKN-002: Network Payload Serialization Precision
- All floating-point coordinates in `WORLD_SNAPSHOT` packets SHALL be rounded to 1 decimal place (`round(x, 1)`, `round(y, 1)`) and angles to 3 decimal places (`round(angle, 3)`), reducing serialization byte length by $>40\%$.

### REQ-TOKN-003: Modular Single-Responsibility Code Organization
- Source files SHALL remain focused and modular (< 300 lines) to minimize context window consumption during AI pair programming and code reviews.
