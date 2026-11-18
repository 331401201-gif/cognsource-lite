plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.cognsource.lite"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cognsource.lite"
        minSdk = 30
        targetSdk = 35
        versionCode = (System.getenv("BUILD_NUMBER") ?: "1").toInt()
        versionName = "1.0." + (System.getenv("BUILD_NUMBER") ?: "1")
    }

    // 固定签名：以后每个新版本都能直接覆盖安装，不用先卸载（卸载会清掉手机里的数据）
    signingConfigs {
        create("lite") {
            storeFile = file("lite.keystore")
            storePassword = System.getenv("LITE_STORE_PASS") ?: "cognsource-lite"
            keyAlias = "lite"
            keyPassword = System.getenv("LITE_STORE_PASS") ?: "cognsource-lite"
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("lite")
        }
        debug { signingConfig = signingConfigs.getByName("lite") }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.webkit:webkit:1.12.1")
}
