plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

// Upload-key material is provided only by CI secrets; never commit .jks files.
val rotaStorePath = System.getenv("ROTA_UPLOAD_KEYSTORE_PATH")
val rotaStorePassword = System.getenv("ROTA_UPLOAD_STORE_PASSWORD")
val rotaKeyAlias = System.getenv("ROTA_UPLOAD_KEY_ALIAS")
val rotaKeyPassword = System.getenv("ROTA_UPLOAD_KEY_PASSWORD")
val rotaStoreSigningReady = !rotaStorePath.isNullOrBlank() &&
    !rotaStorePassword.isNullOrBlank() &&
    !rotaKeyAlias.isNullOrBlank() &&
    !rotaKeyPassword.isNullOrBlank()

android {
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    signingConfigs {
        if (rotaStoreSigningReady) {
            create("playUpload") {
                storeFile = file(rotaStorePath!!)
                storePassword = rotaStorePassword
                keyAlias = rotaKeyAlias
                keyPassword = rotaKeyPassword
            }
        }
    }
    buildTypes {
        getByName("release") {
            if (rotaStoreSigningReady) {
                signingConfig = signingConfigs.getByName("playUpload")
            }
        }
    }
    namespace = "com.rota.app.customer"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.rota.app.customer"
        minSdk = 26
        targetSdk = 36
        versionCode = System.getenv("ROTA_VERSION_CODE")?.toIntOrNull() ?: 1
        versionName = System.getenv("ROTA_VERSION_NAME") ?: "1.0.0"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
}
