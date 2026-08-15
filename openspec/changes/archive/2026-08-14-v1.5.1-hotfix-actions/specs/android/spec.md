## MODIFIED Requirements

### Requirement: REQ-AND-006 Automated GitHub Release Pipeline & APK Asset Generation
The CI/CD pipeline on GitHub Actions MUST automatically validate tests, setup the Gradle runtime environment via `gradle/actions/setup-gradle@v4` (Gradle 8.7), compile precompiled web assets, synchronize Python backend sources to the Chaquopy source tree, compile the Android APK, and attach the `.apk` package to the GitHub Release Assets upon publishing a release or pushing a version tag.

#### Scenario: GitHub Release APK asset upload
- **WHEN** a new GitHub Release is published or a tag matching `v*` is pushed
- **THEN** GitHub Actions sets up Node 20, Python 3.12, JDK 17, Android SDK, and Gradle 8.7 via setup-gradle, validates specs, compiles the frontend bundle, syncs the Python server package, builds the Android APK, and uploads the `.apk` to the release assets
