## MODIFIED Requirements

### Requirement: REQ-AND-006 Automated GitHub Release Pipeline & APK Asset Generation
The CI/CD pipeline on GitHub Actions MUST automatically validate tests, setup the Gradle runtime environment via `gradle/actions/setup-gradle@v4` (Gradle 8.7), compile precompiled web assets, synchronize Python backend sources to the Chaquopy source tree via the Kotlin-DSL-compliant `chaquopy { }` configuration block, compile the Android APK, and attach the `.apk` package to the GitHub Release Assets upon publishing a GitHub Release.

#### Scenario: GitHub Release APK asset upload
- **WHEN** a new GitHub Release is published
- **THEN** GitHub Actions sets up Node 20, Python 3.12, JDK 17, Android SDK, and Gradle 8.7 via setup-gradle, validates specs, compiles the frontend bundle, syncs the Python server package, builds the Android APK using the `chaquopy { defaultConfig { ... }; sourceSets { ... } }` Kotlin DSL block, and uploads the `.apk` to the release assets

#### Scenario: No duplicate release run from tag push
- **WHEN** publishing a GitHub Release creates its underlying git tag
- **THEN** the release workflow triggers exactly once (from the `release` event only), and does not also trigger a second, duplicate run from a `push` tag event
