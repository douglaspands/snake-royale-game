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
        versionCode = 2
        versionName = "1.5.1"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64")
        }

        python {
            version = "3.12"
            pip {
                install("fastapi>=0.110.0")
                install("uvicorn>=0.28.0")
                install("websockets>=12.0")
                install("pydantic>=2.6.0")
                install("jsonschema>=4.21.0")
            }
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
            python.srcDir("src/main/python")
            assets.srcDir("src/main/assets")
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
