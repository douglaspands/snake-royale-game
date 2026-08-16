## Context

See `proposal.md` for the full forensic breakdown of the published v1.5.3 APK. The short version: the pipeline is healthy, the artifact is intact, and the ABI matrix is correct — but `release.yml` ships the `debug` variant, so the release asset is a `debuggable=true` package signed by a keystore that the GitHub runner generates fresh on every run.

This is the fourth consecutive hotfix on the same workflow step, and the first that is not about making the build *succeed*. `v1.5.1` de-duplicated release triggers, `v1.5.2` migrated Chaquopy to the Kotlin DSL, `v1.5.3` cleared the ABI assertion and the chain of blockers behind it. Each of those made the pipeline produce an artifact; this one makes the artifact usable.

The `v1.5.3` `design.md` named this exact change as a Non-Goal — "That requires a keystore plus repository secrets and is release engineering, not a hotfix." That reasoning still holds as a description of the work; what changed is that the keystore and secrets are now being provisioned, so the blocking prerequisite is gone.

Two facts constrain the design. First, the keystore cannot live in the repository, so the build must tolerate its absence without failing configuration — otherwise every contributor and every non-release CI job breaks. Second, a debug artifact reaching the release assets is not a hypothetical: it is what happened, and the failure was silent because nothing in the pipeline inspects what it is about to upload.

## Goals / Non-Goals

**Goals:**
- Publish an APK that installs on a stock Samsung Galaxy S20 FE / Android 13 without disabling device protections.
- Sign every release with the same persistent key, so version N+1 installs over version N in place.
- Make it structurally impossible for a debug-signed or debuggable APK to be uploaded as a release asset again.
- Keep local `assembleDebug` builds working for anyone who does not hold the keystore.
- Give the user a way to distinguish a corrupted download from an install rejection.

**Non-Goals:**
- Enabling R8/ProGuard minification on the release variant. See Decision 3.
- Per-ABI APK splits to reduce the 42.8 MB artifact size. Worth doing, but it changes the release asset layout and is orthogonal to installability; deferred deliberately.
- Play Store publication, App Bundles (`.aab`), or Play App Signing. This project distributes by sideload from GitHub Releases.
- Key rotation tooling. v3 signing is enabled so rotation is *possible* later; no rotation is performed now.
- Any change to the server, the client, the game protocol, or the Chaquopy dependency set.

## Decisions

### 1. Ship `assembleRelease` with a project keystore, not a pinned debug keystore
- **Decision**: Build the `release` variant and sign it with a permanent RSA-4096 keystore held in GitHub Secrets.
- **Rationale**: Two distinct defects need fixing and only this addresses both. Committing a fixed `debug.keystore` would stabilize the signing key — solving the upgrade failure — but leaves `android:debuggable="true"` and the `.debug` application id in place, and the debuggable flag is the property most likely to be what Play Protect is actually rejecting. A debuggable release artifact is also a real exposure: any app on the device with `RUN_AS`-style access, and any connected ADB session, can inspect and manipulate the process, which here embeds a Python interpreter and an HTTP server bound to the LAN.
- **Alternatives Considered**: (a) Commit a shared `debug.keystore` — rejected above. (b) Keep `assembleDebug` and instruct the user to whitelist the app in Play Protect — rejected: it makes every future user perform a security-reducing workaround to install the app, and does nothing about `INSTALL_FAILED_UPDATE_INCOMPATIBLE`.

### 2. Resolve signing credentials from env vars first, `keystore.properties` second, and degrade silently when absent
- **Decision**: A helper reads `ANDROID_KEYSTORE_FILE` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` from the environment, falls back to an unversioned `android/keystore.properties`, and returns null when neither is complete. `buildTypes.release.signingConfig` is assigned only on a non-null result.
- **Rationale**: Gradle evaluates `signingConfigs` at configuration time, so referencing a missing keystore file throws before any task runs — this is the same class of failure `v1.5.3` spent a hotfix on. Degrading to "unsigned release, debug still works" keeps `assembleDebug`, `npm test` and any contributor clone functional without the secret. The env-var-first order exists because CI should never write credentials to a file that a later step could archive into an artifact; only the keystore binary itself is materialized on disk.
- **Alternatives Considered**: (a) `keystore.properties` only, with CI generating the file — rejected: it puts plaintext passwords in the workspace for the remainder of the job. (b) Failing the build when credentials are missing — rejected: it breaks every local build and the PR CI workflow, which have no reason to sign anything.

### 3. Keep `isMinifyEnabled = false` on the release variant
- **Decision**: The release build type keeps minification off, and the existing `proguardFiles` declaration stays inert.
- **Rationale**: Chaquopy resolves Java classes reflectively from Python at runtime. R8 has no visibility into those references, so it would strip or rename classes the Python side looks up by name, producing a build that compiles, installs, and then fails at runtime when the server starts — the worst possible failure mode to introduce in a change whose entire purpose is to make the app work on a device. Correct keep rules are a separate, testable piece of work.
- **Alternatives Considered**: Enabling R8 with broad `-keep class com.snakeroyale.**` rules — rejected: it buys almost no size reduction (the 42.8 MB is dominated by the Python runtime and native libraries, not DEX) at a real correctness risk.

### 4. Enable v2 and v3 signing; do not require v1
- **Decision**: Set `enableV2Signing` and `enableV3Signing` to true explicitly, and `enableV1Signing` to false. The pipeline gate asserts v2 and v3 only.
- **Rationale**: v1 (JAR signing) is only meaningful below API 24, and `minSdk` here is 24, so every target device verifies v2. v3 is what makes future key rotation possible at all; adding it later, after the key is already in the field, is significantly harder. Declaring both explicitly pins the behavior against future AGP default changes.
- **Corrected after the second dry-run**: this decision originally mandated v1 as well, reasoning that OEM installers are stricter than AOSP and that a v1 signature "costs only build time". Run [31925954702](https://github.com/douglaspands/snake-royale-game/actions/runs/31925954702) disproved the premise: the APK verified v2 and v3 but reported `v1 scheme (JAR signing): false` despite `enableV1Signing = true`, and AGP emitted no warning — it simply omits JAR signing at `minSdk >= 24` regardless of the flag. Requiring v1 was therefore unsatisfiable, not merely cautious. It was also the wrong instinct on the merits: v1 is a security liability on its own (Janus, CVE-2017-13156), and the v2-only v1.5.3 artifact shows v1's absence was never what blocked installation — the `debuggable` flag and the debug certificate were.
- **Alternatives Considered**: Forcing v1 by re-signing the APK with `apksigner --v1-signing-enabled true` after the Gradle build — rejected: it works around AGP to obtain a signature the platform does not need, on a device that verifies v2, and adds a post-build mutation step to a pipeline whose whole problem was insufficient visibility into what it produces.

### 5. Verify the artifact before upload, in the pipeline
- **Decision**: A step between the build and the upload runs `apksigner verify --print-certs` plus `aapt dump badging` and fails the job if the signer subject contains `CN=Android Debug` or the badging output reports `application-debuggable`.
- **Rationale**: The defect this change fixes was invisible for a full release cycle because the pipeline treats "a file exists at the expected path" as success. `APK_SOURCE` is a string in a shell script, and it already has a `find`-based fallback that will happily pick up *any* APK under `build/outputs/` — including a debug one — if the primary path is wrong. An assertion on the artifact's actual properties is the only thing that closes that hole, and it is the difference between this being fixed and being fixed *durably*.
- **Alternatives Considered**: Removing the `find` fallback instead — rejected: the fallback has diagnostic value when a path assumption breaks, and removing it would still not catch a case where `assembleRelease` silently produced an unsigned APK because the secrets were missing (Decision 2 makes that a real, reachable state).

### 6. Publish a `.sha256` next to the APK
- **Decision**: Emit a checksum file into the release assets.
- **Rationale**: "App not installed" is the same message for a rejected package and a truncated download. Inspecting the v1.5.3 artifact required downloading 42 MB and running `unzip -t` to rule the second one out. A published checksum lets the user answer that question in one command, before any further investigation.

## Risks / Trade-offs

- **Keystore loss is unrecoverable.** If the `.jks` is lost, no future release can be installed as an update over an existing one; every user would have to uninstall and lose local state. Mitigation: the README documents that the keystore must be backed up outside the repository, and v3 signing is enabled so a rotation path exists while the current key is still available.
- **The application id changes.** `com.snakeroyale.host.debug` → `com.snakeroyale.host`. Anyone running a v1.5.3 build has a package that will not be upgraded, only shadowed. Given that the v1.5.3 APK is the subject of this bug report and is believed to be uninstallable in practice, the affected population is approximately zero — but it is a one-time discontinuity and is called out in the proposal's Impact section.
- **The release job now depends on four secrets.** A `workflow_dispatch` dry-run from a fork, or from a repository where the secrets are unset, will produce an unsigned release APK; Decision 5's verification step converts that from a silent bad upload into a loud job failure, which is the intended trade.
- **The fix is not confirmed against the device.** Every structural cause was ruled out by inspection, and the debuggable-plus-unknown-key combination is the strongest remaining explanation for the generic "Aplicativo não instalado" — but the device's actual `INSTALL_FAILED_*` code has not been read. `tasks.md` therefore keeps an explicit `adb logcat` capture step: if a correctly signed release APK still fails, that log names the real cause instead of leaving another round of inference.
