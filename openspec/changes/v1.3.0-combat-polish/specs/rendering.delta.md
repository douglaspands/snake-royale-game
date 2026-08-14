# Rendering & Anti-Jitter Delta Specification: v1.3.0-COMBAT-POLISH

## 1. Clock-Synchronized Anti-Jitter Interpolator
```diff
  public pushSnapshot(snapshot: WorldSnapshotPayload, clientNowMs?: number): void {
+     const clientArrivalMs = clientNowMs ?? performance.now();
+     this._buffer.push({ snapshot, clientArrivalMs });
  }
```

## 2. 12+ Mixed and Bicolor Skins
- 12+ high-contrast skins supporting alternating patterns, cosmic gradients, hazard stripes, and rainbow palettes for 10+ concurrent players.
