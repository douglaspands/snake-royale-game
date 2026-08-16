import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.chaquo.python")
}

// Release signing credentials, resolved from the environment first (CI passes them
// through the process env so no plaintext password ever lands in the workspace) and
// from an unversioned android/keystore.properties second (local release builds).
// Returns null when neither source is complete: Gradle evaluates signingConfigs at
// configuration time, so referencing a missing keystore would break every clone that
// only ever builds debug. See REQ-AND-009.
val releaseSigning: Map<String, String>? = run {
    val fromEnv = mapOf(
        "storeFile" to System.getenv("ANDROID_KEYSTORE_FILE"),
        "storePassword" to System.getenv("ANDROID_KEYSTORE_PASSWORD"),
        "keyAlias" to System.getenv("ANDROID_KEY_ALIAS"),
        "keyPassword" to System.getenv("ANDROID_KEY_PASSWORD"),
    )
    val resolved = if (fromEnv.values.none { it.isNullOrBlank() }) {
        fromEnv.mapValues { it.value!! }
    } else {
        val propsFile = rootProject.file("keystore.properties")
        if (!propsFile.isFile) return@run null
        val props = Properties().apply { propsFile.inputStream().use { load(it) } }
        val fromFile = listOf("storeFile", "storePassword", "keyAlias", "keyPassword")
            .associateWith { props.getProperty(it) }
        if (fromFile.values.any { it.isNullOrBlank() }) return@run null
        fromFile.mapValues { it.value!! }
    }
    if (rootProject.file(resolved.getValue("storeFile")).isFile) resolved else null
}

android {
    namespace = "com.snakeroyale.host"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.snakeroyale.host"
        minSdk = 24
        targetSdk = 34
        versionCode = 6
        versionName = "1.6.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Chaquopy ships no Python 3.12 runtime for 32-bit ARM; adding armeabi-v7a
        // here fails the Gradle configuration phase. See REQ-AND-007.
        ndk {
            abiFilters += listOf("arm64-v8a", "x86_64")
        }
    }

    signingConfigs {
        // Bound to a local first: a script-level `val` is a property of the generated
        // script class, so relying on a smart cast here risks a configuration-time
        // compile error -- the exact failure mode this project has already spent
        // three hotfixes on.
        val credentials = releaseSigning
        if (credentials != null) {
            create("release") {
                storeFile = rootProject.file(credentials.getValue("storeFile"))
                storePassword = credentials.getValue("storePassword")
                keyAlias = credentials.getValue("keyAlias")
                keyPassword = credentials.getValue("keyPassword")

                // v1 (JAR signing) is only meaningful below API 24, and minSdk here
                // is 24 -- AGP omits it regardless of what this flag says, as the
                // first signed dry-run confirmed. It is also a liability on its own
                // (Janus, CVE-2017-13156). v2 is what every target device verifies;
                // v3 is what makes future key rotation possible. See REQ-AND-009.
                enableV1Signing = false
                enableV2Signing = true
                enableV3Signing = true
            }
        }
    }

    buildTypes {
        release {
            // Chaquopy resolves Java classes reflectively from Python, so R8 would
            // strip names the Python side looks up at runtime: the build would
            // succeed and the server would fail on start. Keep rules are separate
            // work -- see the v1.5.4 design.md, Decision 3.
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // Left unsigned when no credentials are available, so a clone without
            // the keystore still configures and can build debug.
            signingConfig = signingConfigs.findByName("release")
        }
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    sourceSets {
        getByName("main") {
            assets.srcDir("src/main/assets")
        }
    }
}

chaquopy {
    defaultConfig {
        version = "3.12"
        // Every package here must be pure Python: Chaquopy can only install native
        // packages it has prebuilt wheels for, and it has none for the Rust extensions
        // behind pydantic (pydantic-core) or jsonschema (rpds-py). The server targets
        // Starlette directly for exactly this reason -- see REQ-AND-008.
        pip {
            install("starlette>=0.36.0")
            install("uvicorn>=0.28.0")
            install("websockets>=12.0")
        }
    }
    sourceSets {
        getByName("main") {
            srcDir("src/main/python")
        }
    }
}

tasks.register<Copy>("syncServerSources") {
    from("${rootProject.projectDir}/../server")
    into("${projectDir}/src/main/python/server")
    duplicatesStrategy = DuplicatesStrategy.INCLUDE
}

tasks.named("preBuild") {
    dependsOn("syncServerSources")
}

// syncServerSources writes into src/main/python, which Chaquopy consumes as a Python
// source root. Without an explicit edge, Gradle rejects the build with an
// implicit-dependency validation error. See REQ-AND-006.
tasks.matching { it.name.startsWith("merge") && it.name.endsWith("PythonSources") }
    .configureEach {
        dependsOn("syncServerSources")
    }

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    // Reference QR encoder: pure Java, no Android or native component. Replaces a
    // hand-rolled generator that produced undecodable symbols. See REQ-AND-002.
    // This is a Gradle dependency of the Android module only -- it never enters the
    // Chaquopy Python tree, so REQ-AND-008 is unaffected.
    implementation("com.google.zxing:core:3.5.3")
}
