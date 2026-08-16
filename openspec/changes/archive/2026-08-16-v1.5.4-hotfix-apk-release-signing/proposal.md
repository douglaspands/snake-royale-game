## Why

The v1.5.3 release pipeline finally built and published an APK end to end — but the artifact it publishes cannot be installed. On a Samsung Galaxy S20 FE running Android 13 (One UI 5.1) the progress bar completes and the system reports the generic **"Aplicativo não instalado"**.

The published asset (`snake-royale-server-v1.5.3.apk`, 42,883,940 bytes) was downloaded and inspected. The APK is **not** corrupt and the failure is **not** an ABI mismatch. Every structural property checks out:

| Property | Observed |
| :--- | :--- |
| ZIP integrity (`unzip -t`, 950 entries) | intact — the download is complete |
| ABI coverage | `lib/arm64-v8a/` present (plus `lib/x86_64/`); the S20 FE is `arm64-v8a` |
| Native libraries | `STORED`, aligned to both 4 KB and 16 KB page boundaries |
| `android:testOnly` | absent — would otherwise cause `INSTALL_FAILED_TEST_ONLY` |
| Bundled assets | `assets/client_dist/` and `assets/chaquopy/` present |
| `minSdk 24` / `targetSdk 34` against API 33 | valid — a `targetSdk` above the device API level is permitted |
| `<property>` inside `<service>` | valid — the element exists since API 31 |
| `FOREGROUND_SERVICE_SPECIAL_USE` | an unknown permission on API 33 is ignored at install, not rejected |

The root cause is what kind of APK the pipeline publishes. `release.yml` runs `gradle assembleDebug`, so the release asset is a **debug build**:

1. The compiled manifest declares `applicationId = com.snakeroyale.host.debug`, from the `applicationIdSuffix = ".debug"` on `buildTypes.debug`.
2. The APK is `android:debuggable="true"`.
3. It is signed with an **ephemeral debug keystore generated inside the GitHub runner**. The extracted v2 signer certificate reads `CN=Android Debug, O=Android, C=US`, with `notBefore = Aug 16 03:08:06 2026 GMT` — minutes before the release was published — and SHA-256 fingerprint `88:F1:A7:A5:1B:7F:20:D8:44:92:F2:BF:37:ED:37:AF:77:77:B5:F5:29:DD:C9:69:A1:82:42:B8:2D:B4:A2:D6`. Because the runner is disposable, **every release is signed with a different key**.
4. Only one signature scheme is present: v2 (block ID `0x7109871a`). There is no v1 (JAR) and no v3 signature.

Android 13's "Verify apps" / Play Protect path rejects `debuggable=true` sideloads signed by an unrecognised key at the final step of installation, which is precisely the observed symptom. Independently of that, the ephemeral key guarantees that **every future update fails** with `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, forcing a full uninstall for each version.

This work was explicitly deferred by the previous hotfix: the `v1.5.3` `design.md` records "Publishing a signed `assembleRelease` APK instead of the current `assembleDebug` artifact" as a Non-Goal, on the grounds that it needs a keystore plus repository secrets. That prerequisite is now being met, so the deferral is closed here.

## What Changes

- Add a `signingConfigs.release` block to `android/app/build.gradle.kts` that resolves credentials from environment variables (CI) and falls back to an unversioned `android/keystore.properties` (local builds), enabling the v1, v2 and v3 signature schemes explicitly.
- Wire that signing config into `buildTypes.release` **conditionally**, so a developer without the keystore can still configure and build the project.
- Switch `.github/workflows/release.yml` from `gradle assembleDebug` to `gradle assembleRelease`, decoding the keystore from a base64 repository secret before the build and pointing the artifact step at `app-release.apk`.
- Add a post-build verification step that fails the job when the produced APK is signed by `CN=Android Debug` or is marked debuggable, so a debug artifact can never again reach the release assets.
- Publish a `.sha256` checksum alongside the APK so a truncated download can be distinguished from an install rejection.
- Add `*.keystore`, `*.jks` and `android/keystore.properties` to `.gitignore`; the `.claude/settings.json` deny list already covers the first two but `.gitignore` does not.
- Bump the APK identity to `versionCode = 4` / `versionName = "1.5.4"` and synchronize `openspec/config.yaml`, `package.json` and `pyproject.toml`.
- Document keystore generation and secret registration in `README.md`.

## Capabilities

### New Capabilities
*(None)*

### Modified Capabilities
- `android`: Add `REQ-AND-009` (Release APK Signing & Device Installability), requiring the published APK to be a non-debuggable release build signed with a persistent project keystore under the v1, v2 and v3 schemes, with an identity stable across releases so in-place updates succeed. Update `REQ-AND-006` (Automated GitHub Release Pipeline & APK Asset Generation) to build the `release` variant, verify the signer before upload, and publish a checksum.

## Impact

- **Affected Files**:
  - `android/app/build.gradle.kts`
  - `.github/workflows/release.yml`
  - `.gitignore`
  - `openspec/config.yaml`, `package.json`, `pyproject.toml`
  - `README.md`
- **New Repository Secrets** (required for the release job to succeed): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- **Package Identity Change**: the published application id moves from `com.snakeroyale.host.debug` to `com.snakeroyale.host`. Anyone who managed to install a v1.5.3 debug build must uninstall it first; the two are distinct packages and will not conflict.
- **One-Way Operational Constraint**: the release keystore becomes permanent project infrastructure. Losing it makes it impossible to publish an update installable over an existing install.
- **Dependencies & Tools**: no version bump to Chaquopy (`15.0.1`), AGP (`8.4.1`), Kotlin (`1.9.24`) or Gradle (`8.7`). No GitHub Action major changes.
- **Zero Breaking API Changes**: game protocol, WebSocket interfaces, frontend client, and server game loop logic are untouched. No backend or frontend source file changes.
