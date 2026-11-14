plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }

android {
    namespace = "com.rota.app.driver"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.rota.app.driver"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.appcompat:appcompat:1.7.1")
}
