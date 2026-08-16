## ADDED Requirements

### Requirement: REQ-AND-009 Release APK Signing & Device Installability
The APK attached to a GitHub Release MUST be built from the `release` variant and MUST be signed with a persistent project keystore whose credentials are supplied at build time from the environment or from an unversioned `android/keystore.properties`. The signing configuration MUST enable the v1, v2 and v3 signature schemes. The published APK MUST NOT be debuggable, MUST NOT carry a debug `applicationIdSuffix`, and MUST NOT be signed by the AGP-generated debug certificate. The keystore MUST NOT be committed to the repository, and `.gitignore` MUST exclude `*.keystore`, `*.jks` and `android/keystore.properties`. The signing identity MUST remain stable across releases so that a newer version installs over an older one in place.

#### Scenario: Published APK is a signed, non-debuggable release build
- **GIVEN** the release workflow ran with the signing secrets configured
- **WHEN** the published APK is inspected with `apksigner verify --print-certs` and `aapt dump badging`
- **THEN** the signer subject MUST NOT be `CN=Android Debug`, the v1, v2 and v3 schemes MUST all report as verified, the package name MUST be `com.snakeroyale.host` with no `.debug` suffix, and the badging output MUST NOT report `application-debuggable`

#### Scenario: Clean installation on a supported device
- **GIVEN** a device running Android 13 on the `arm64-v8a` ABI with no prior version of the application installed
- **WHEN** the user installs the published APK by sideload
- **THEN** installation completes successfully without requiring the user to disable Play Protect or any other device protection

#### Scenario: In-place update over the previous release
- **GIVEN** a device with release version N of the application installed
- **WHEN** the user installs release version N+1, signed with the same project keystore and carrying a strictly greater `versionCode`
- **THEN** the installation succeeds as an update, without `INSTALL_FAILED_UPDATE_INCOMPATIBLE` and without requiring the user to uninstall version N first

#### Scenario: Build degrades gracefully without signing credentials
- **GIVEN** a developer clone with no signing environment variables and no `android/keystore.properties`
- **WHEN** Gradle configures the `:app` project and runs `assembleDebug`
- **THEN** the configuration phase completes without error, no `signingConfig` is attached to the `release` build type, and the debug build succeeds

#### Scenario: Release keystore is never committed
- **WHEN** the repository working tree is inspected at any commit on the default branch
- **THEN** no `*.jks`, `*.keystore` or `android/keystore.properties` file is tracked by git

## MODIFIED Requirements

### Requirement: REQ-AND-006 Automated GitHub Release Pipeline & APK Asset Generation
The CI/CD pipeline on GitHub Actions MUST automatically validate tests, setup the Gradle runtime environment via `gradle/actions/setup-gradle` (Gradle 8.7), compile precompiled web assets, synchronize Python backend sources to the Chaquopy source tree via the Kotlin-DSL-compliant `chaquopy { }` configuration block, compile the Android APK for the ABI matrix defined in `REQ-AND-007` using the `release` variant with the signing configuration defined in `REQ-AND-009`, verify the resulting artifact's signer and debuggable flag before publication, and attach the `.apk` package together with a `.sha256` checksum file to the GitHub Release Assets upon publishing a GitHub Release. Every GitHub Action referenced by the workflow MUST be pinned to a major version whose `action.yml` declares a supported Node runtime (`node24`), so the pipeline produces no runtime deprecation annotations. The APK's `versionCode` and `versionName` MUST be kept in sync with the published release tag.

#### Scenario: GitHub Release APK asset upload
- **WHEN** a new GitHub Release is published
- **THEN** GitHub Actions sets up Node, Python 3.12, JDK 17, Android SDK, and Gradle 8.7 via setup-gradle, validates specs, compiles the frontend bundle, syncs the Python server package, builds the signed release APK using the `chaquopy { defaultConfig { ... }; sourceSets { ... } }` Kotlin DSL block for the `arm64-v8a` and `x86_64` ABIs, and uploads the `.apk` and its `.sha256` checksum to the release assets

#### Scenario: Debug artifact is rejected before upload
- **GIVEN** the build produced an APK signed by `CN=Android Debug`, or one whose badging reports `application-debuggable`
- **WHEN** the pipeline reaches the artifact verification step
- **THEN** the job MUST fail with an explicit message naming the offending property, and the upload step MUST NOT run

#### Scenario: Signing key material is provided by repository secrets
- **GIVEN** the repository defines the secrets `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`
- **WHEN** the release job runs
- **THEN** the keystore is decoded from base64 to a file outside version control, the passwords are passed to Gradle through the process environment rather than written to any file in the workspace, and no secret value is echoed to the job log

#### Scenario: No duplicate release run from tag push
- **WHEN** publishing a GitHub Release creates its underlying git tag
- **THEN** the release workflow triggers exactly once (from the `release` event only), and does not also trigger a second, duplicate run from a `push` tag event

#### Scenario: Release build verified before tagging
- **GIVEN** a hotfix branch containing Android build configuration changes
- **WHEN** the release workflow is dispatched manually via `workflow_dispatch` against that branch
- **THEN** the APK is compiled end to end, and the upload step is skipped because the ref is not a tag and the event is not `release`, leaving all published release assets untouched

#### Scenario: Server source synchronization is wired into the task graph
- **GIVEN** the `syncServerSources` task copies `server/` into `android/app/src/main/python/server`, a directory Chaquopy consumes as a Python source root
- **WHEN** Gradle validates the task graph for `assembleRelease`
- **THEN** the Chaquopy `merge<Variant>PythonSources` tasks MUST declare an explicit dependency on `syncServerSources`, so Gradle reports no implicit-dependency validation problem and the sources are always copied before they are merged

#### Scenario: Every manifest-declared resource resolves at link time
- **GIVEN** `AndroidManifest.xml` declares `android:icon="@mipmap/ic_launcher"` and `android:roundIcon="@mipmap/ic_launcher_round"`
- **WHEN** the `:app:processReleaseResources` task links the application resources
- **THEN** both mipmaps MUST exist for every standard density bucket (mdpi through xxxhdpi), so AAPT reports no `resource not found` error and the APK ships with a launcher icon

#### Scenario: Workflow runs free of runtime deprecation warnings
- **WHEN** any job in the release workflow completes
- **THEN** the run reports no `Node.js 20 is deprecated` annotation, because every referenced action resolves to a `node24` runtime
