## 1. Node 0 — Environment & Specification Validation

*Prerequisite for every later node: the SDD gate runs before any production code is touched.*

- [x] 1.1 Create the hotfix branch `hotfix/1.5.4-apk-release-signing`
- [x] 1.2 Run `openspec validate --specs --no-interactive` on the pre-change tree to confirm a clean baseline
- [x] 1.3 Author the `android` delta spec (ADDED `REQ-AND-009`, MODIFIED `REQ-AND-006`) before editing any build file
- [x] 1.4 Confirm `.gitignore` lacks keystore coverage and add `*.keystore`, `*.jks` and `android/keystore.properties`

## 2. Node B1 — Release Signing Configuration

- [x] 2.1 Add a credential resolver to `android/app/build.gradle.kts` reading `ANDROID_KEYSTORE_FILE` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS` / `ANDROID_KEY_PASSWORD` from the environment, falling back to `android/keystore.properties`, returning null when incomplete
- [x] 2.2 Declare `signingConfigs { create("release") { ... } }` with `enableV2Signing` and `enableV3Signing` true, and `enableV1Signing` false — AGP omits JAR signing at `minSdk 24` regardless (see `design.md` Decision 4)
- [x] 2.3 Attach the signing config to `buildTypes.release` only when the resolver returns credentials, so configuration succeeds on a clone without the keystore
- [x] 2.4 Keep `isMinifyEnabled = false` on the release variant — R8 would strip the classes Chaquopy resolves reflectively from Python (see `design.md` Decision 3)
- [x] 2.5 Bump the APK identity to `versionCode = 4` and `versionName = "1.5.4"`
- [ ] 2.6 Verify `gradle assembleDebug` still configures with no credentials present — **not runnable locally** (no `gradle`, `ANDROID_HOME` unset, no wrapper in `android/`); the resolver was written to avoid the script-property smart cast that would fail at configuration time, but this is confirmed only by the CI dry-run in 7.2

## 3. Node B2 — Release Workflow Migration

- [x] 3.1 Add a keystore decode step to `.github/workflows/release.yml` writing `ANDROID_KEYSTORE_BASE64` to a file outside the workspace-archived paths
- [x] 3.2 Switch the build step from `gradle assembleDebug` to `gradle assembleRelease`, passing the four signing values through the process environment
- [x] 3.3 Point `APK_SOURCE` at `android/app/build/outputs/apk/release/app-release.apk`, retaining the `find` fallback
- [x] 3.4 Add a post-build verification step that fails the job when `apksigner verify --print-certs` reports a `CN=Android Debug` signer or `aapt dump badging` reports `application-debuggable`
- [x] 3.5 Generate a `.sha256` checksum file and include it in the uploaded release assets
- [x] 3.6 Confirm no secret value is echoed to the job log at any step

## 4. Node B3 — Version Metadata Synchronization

- [x] 4.1 Update `openspec/config.yaml` `project.version` to `1.5.4-ANDROID-HOST`
- [x] 4.2 Update `package.json` `version` to `1.5.4`
- [x] 4.3 Update `pyproject.toml` `version` to `1.5.4`

## 5. Node DOC — Keystore Provisioning Documentation

- [x] 5.1 Document `keytool -genkeypair` keystore generation and base64 encoding in `README.md`
- [x] 5.2 Document the four required repository secrets and their registration
- [x] 5.3 State explicitly that the keystore must be backed up outside the repository, and that losing it prevents publishing installable updates

## 6. Node INT — Quality Gates & Verification

- [x] 6.1 Run `openspec validate --specs --no-interactive` and confirm the delta spec passes
- [x] 6.2 Run `npm test` (pytest + vitest + spec validation) and `npm run lint` — both must stay green; this change touches no server or client source
- [x] 6.3 Verify the workflow and Gradle changes by inspection (no local `gradle`, `ANDROID_HOME` unset, and `android/` has no Gradle wrapper — same constraint recorded in the v1.5.3 change)

## 7. Node REL — Device Verification *(requires the user's keystore and device)*

*Blocked on the manual keystore generation and secret registration described in Node DOC; these steps run after the code is merged to the hotfix branch.*

- [x] 7.1 Generate the release keystore and register the four repository secrets
- [x] 7.2 Dry-run `gh workflow run release.yml --ref hotfix/1.5.4-apk-release-signing`; the upload step is skipped on a non-tag ref, so no published asset is touched
- [x] 7.3 Download the dry-run artifact and confirm: signer is `CN=Douglas Panhota` (not `CN=Android Debug`), v2 and v3 verify, package is `com.snakeroyale.host` at versionCode 4, not debuggable, `lib/arm64-v8a/` present, published `.sha256` matches
- [ ] 7.4 Install on the Samsung Galaxy S20 FE (Android 13) and confirm the install completes without disabling Play Protect
- [ ] 7.5 If the install still fails, capture the real error with `adb logcat -s PackageInstaller:* PackageManager:*` during installation to obtain the exact `INSTALL_FAILED_*` code instead of the generic UI message
- [ ] 7.6 Verify in-place update by installing a subsequent build signed with the same keystore over v1.5.4, without uninstalling
- [ ] 7.7 Tag and publish release `v1.5.4`, then verify the published asset and its checksum
