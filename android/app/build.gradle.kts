plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.chaquo.python")
}

android {
    namespace = "com.snakeroyale.host"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.snakeroyale.host"
        minSdk = 24
        targetSdk = 34
        versionCode = 3
        versionName = "1.5.3"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Chaquopy ships no Python 3.12 runtime for 32-bit ARM; adding armeabi-v7a
        // here fails the Gradle configuration phase. See REQ-AND-007.
        ndk {
            abiFilters += listOf("arm64-v8a", "x86_64")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
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
        pip {
            install("fastapi>=0.110.0")
            install("uvicorn>=0.28.0")
            install("websockets>=12.0")
            install("pydantic>=2.6.0")
            install("jsonschema>=4.21.0")
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

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.activity:activity-ktx:1.9.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
}
