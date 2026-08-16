## Context

See `proposal.md` § Why. Three independent hygiene defects found while validating `v1.6.1`, recorded there as follow-ups 8.2, 8.3 and 8.4. They ship together because each is a few lines, none affects gameplay, and all three concern the release artifact and its diagnosability rather than the game itself.

## Goals / Non-Goals

**Goals**
- `android/app/src/main/assets/client_dist/` is an exact mirror of `client/dist/` after every sync.
- `/health` reports the version of the application actually running.
- Lane worktrees never appear as untracked git noise.

**Non-Goals**
- Reworking the release workflow, the signing configuration, or the ABI matrix. Untouched.
- Adding a version string to the WebSocket protocol or to any packet. `/health` is an HTTP diagnostic endpoint; the wire protocol is out of scope.
- Compressing, minifying or otherwise optimising the APK payload beyond removing what should never have been in it.
- Fixing follow-up 8.5 (lane worktree base). See `proposal.md` § Non-goals.

## Decisions

### D1 — Clear the destination in the sync script rather than pruning by pattern
The script becomes `rm -rf ../android/app/src/main/assets/client_dist && mkdir -p … && cp -r dist/* …`. *Alternative considered:* delete only `assets/index-*` before copying — rejected, because it encodes Vite's current naming convention into the script and would silently stop pruning if that convention changed. *Alternative considered:* `rsync --delete` — rejected, `rsync` is not a declared dependency of this repository and the release runs in CI where it may be absent. A full clear plus copy needs nothing beyond coreutils.

The destination is a generated mirror (`CLAUDE.md` § Eficiência de tokens states it is never edited by hand and its source is always `client/dist/`), so deleting it wholesale destroys nothing that is not immediately regenerated. This is the property that makes the blunt approach safe, and it is the reason the script — not a manual cleanup — is the right place to fix it.

### D2 — Read the version from package metadata, not from a second literal
`health_check` reads the installed distribution's version via `importlib.metadata.version` against the project's own name, so `/health` inherits the version already declared in `pyproject.toml`. *Alternative considered:* a module-level `__version__` constant — rejected, it is a second place to forget, which is exactly the failure being fixed. The lookup is resolved once at import time, not per request, so the endpoint keeps its trivial cost.

The `-VIPER` style suffix carried by the old literal is dropped: it is a codename, it never matched `pyproject.toml`, and preserving it would require the second source of truth this decision exists to remove.

### D3 — Fall back rather than fail when metadata is unavailable
Chaquopy installs the server into the APK, and the embedded runtime may not expose full distribution metadata. If the lookup raises `PackageNotFoundError`, the endpoint reports `"unknown"` rather than propagating — a health endpoint that 500s because it cannot name its own version would turn a cosmetic gap into an outage, and the Android dashboard treats a failed `/health` as Offline (`REQ-AND-001`). Task `1.4` verifies which branch the packaged app actually takes.

## Risks / Trade-offs

- **[Risk]** `rm -rf` on a path built from a relative string in an npm script. A typo, or the script running from an unexpected working directory, deletes the wrong tree. → Mitigation: the script already `cd client` first and the path is written relative to that, identical to the existing `cp` target in the same line; task `1.2` verifies the resolved path before the script is run for real, and the directory is regenerated immediately by the `cp` that follows.
- **[Risk]** `importlib.metadata` returns the version of an unexpected distribution if the project name in `pyproject.toml` and the installed name diverge. → Mitigation: task `1.3` asserts the value returned matches `pyproject.toml` in the test suite, so a divergence fails the gate rather than shipping.
- **[Risk]** Under Chaquopy the metadata lookup may fall back to `"unknown"`, making `/health` less informative on the exact platform where it is most used. → This is strictly better than today's confidently wrong `1.0.0-VIPER`, and task `3.3` records which branch the device takes so a follow-up can address it with evidence if needed.
- **[Trade-off]** Bundling three unrelated fixes. → Accepted: each is a few lines, none carries gameplay risk, and three separate changes would cost more ceremony than the fixes themselves.
