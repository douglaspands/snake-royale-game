## ADDED Requirements

### Requirement: REQ-AND-007 Supported CPU Architecture (ABI) Matrix
The Android host application MUST be compiled exclusively for the `arm64-v8a` and `x86_64` ABIs. The `android.defaultConfig.ndk.abiFilters` declaration MUST NOT include any ABI for which the Chaquopy plugin does not publish a runtime matching the configured `chaquopy.defaultConfig.version`, and that configured Python version MUST satisfy the `requires-python` constraint declared by the backend in `pyproject.toml`.

#### Scenario: Gradle configuration succeeds with a compatible ABI set
- **GIVEN** `abiFilters` is declared as `listOf("arm64-v8a", "x86_64")` and `chaquopy.defaultConfig.version` is `"3.12"`
- **WHEN** Gradle evaluates the `:app` project and the Chaquopy plugin runs its `afterVariant` hook
- **THEN** `com.chaquo.python.PythonPlugin.getAbis` resolves a runtime for every requested ABI, the configuration phase completes without a `GradleException`, and task execution proceeds to `assembleDebug`

#### Scenario: Unsupported 32-bit ABI is rejected at configuration time
- **GIVEN** `abiFilters` includes `armeabi-v7a` while `chaquopy.defaultConfig.version` is `"3.12"`
- **WHEN** Gradle evaluates the `:app` project
- **THEN** the build fails during configuration with `Python 3.12 is not available for the ABI 'armeabi-v7a'`, and this configuration MUST NOT be committed to the repository

#### Scenario: Embedded Python runtime tracks the backend target
- **GIVEN** `pyproject.toml` declares `requires-python = ">=3.12"` and the CI backend gate runs on Python 3.12
- **WHEN** the Chaquopy Python version bundled into the APK is selected
- **THEN** it MUST be a version satisfying that same constraint, so the server executes on the interpreter its test and type gates validated

## MODIFIED Requirements

### Requirement: REQ-AND-006 Automated GitHub Release Pipeline & APK Asset Generation
The CI/CD pipeline on GitHub Actions MUST automatically validate tests, setup the Gradle runtime environment via `gradle/actions/setup-gradle` (Gradle 8.7), compile precompiled web assets, synchronize Python backend sources to the Chaquopy source tree via the Kotlin-DSL-compliant `chaquopy { }` configuration block, compile the Android APK for the ABI matrix defined in `REQ-AND-007`, and attach the `.apk` package to the GitHub Release Assets upon publishing a GitHub Release. Every GitHub Action referenced by the workflow MUST be pinned to a major version whose `action.yml` declares a supported Node runtime (`node24`), so the pipeline produces no runtime deprecation annotations. The APK's `versionCode` and `versionName` MUST be kept in sync with the published release tag.

#### Scenario: GitHub Release APK asset upload
- **WHEN** a new GitHub Release is published
- **THEN** GitHub Actions sets up Node, Python 3.12, JDK 17, Android SDK, and Gradle 8.7 via setup-gradle, validates specs, compiles the frontend bundle, syncs the Python server package, builds the Android APK using the `chaquopy { defaultConfig { ... }; sourceSets { ... } }` Kotlin DSL block for the `arm64-v8a` and `x86_64` ABIs, and uploads the `.apk` to the release assets

#### Scenario: No duplicate release run from tag push
- **WHEN** publishing a GitHub Release creates its underlying git tag
- **THEN** the release workflow triggers exactly once (from the `release` event only), and does not also trigger a second, duplicate run from a `push` tag event

#### Scenario: Release build verified before tagging
- **GIVEN** a hotfix branch containing Android build configuration changes
- **WHEN** the release workflow is dispatched manually via `workflow_dispatch` against that branch
- **THEN** the APK is compiled end to end, and the upload step is skipped because the ref is not a tag and the event is not `release`, leaving all published release assets untouched

#### Scenario: Workflow runs free of runtime deprecation warnings
- **WHEN** any job in the release workflow completes
- **THEN** the run reports no `Node.js 20 is deprecated` annotation, because every referenced action resolves to a `node24` runtime
