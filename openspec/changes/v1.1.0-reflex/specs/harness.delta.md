# OpenSpec Delta: Latency & Reflex Test Harness Invariants
**Domain:** `harness`  
**Change ID:** `v1.1.0-reflex`  
**Target:** `openspec/specs/harness/spec.md`  

---

## 1. Requirements

### REQ-HARN-003: Sub-Millisecond Input-to-Prediction Verification
The test harness MUST include deterministic test cases that verify:
1. Local predictor advances head coordinates immediately upon `step(dt)` without network dependency.
2. Reconciliation decays positional divergence to $<0.01\text{px}$ within 5 frames.
3. Zero `time.sleep()` calls in any test case.
