---
sidebar_position: 2
title: Getting Started
---

# Getting Started

## 1. Add the dependency

The SDK is published to an internal Maven repo (not Maven Central / JitPack).
Add it to `settings.gradle.kts`:

```kotlin title="settings.gradle.kts"
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("sftp://172.16.3.122:22/home/altaf/maven-repo")
            credentials {
                username = System.getenv("OZI_MAVEN_USER") ?: providers.gradleProperty("ozi.maven.user").orNull
                password = System.getenv("OZI_MAVEN_PASSWORD") ?: providers.gradleProperty("ozi.maven.password").orNull
            }
        }
    }
}
```

:::info[Get the credentials from your lead]
The real username/password aren't published here — ask your team lead or check
the internal secrets doc, then put them in your **own**
`~/.gradle/gradle.properties` (never commit them to a project repo):

```properties title="~/.gradle/gradle.properties"
ozi.maven.user=...
ozi.maven.password=...
```
:::

Then in the app module:

```kotlin title="app/build.gradle.kts"
dependencies {
    implementation("com.ozi.admob:ads:2.0.3") // check the latest published version with your lead
}
```

Add the ProGuard rules the SDK needs downstream:

```pro title="app/proguard-rules.pro"
-keep class kotlin.jvm.internal.** { *; }
-dontwarn com.facebook.infer.annotation.Nullsafe$Mode
-dontwarn com.facebook.infer.annotation.Nullsafe
```

:::warning[minSdk 24, and no legacy ads dependency]
This SDK line requires `minSdk = 24` (the Next-Gen GMA SDK's floor — 23 on the
legacy `1.4.x` line). It also cannot coexist with
`com.google.android.gms:play-services-ads` in the same APK — if any other
dependency pulls that in transitively, exclude it:

```kotlin title="app/build.gradle.kts"
configurations.configureEach {
    exclude(group = "com.google.android.gms", module = "play-services-ads")
    exclude(group = "com.google.android.gms", module = "play-services-ads-lite")
}
```
:::

## 2. Manifest

```xml title="AndroidManifest.xml"
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application>
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-XXXXXXXX~YYYYYYYY" />
    <property
        android:name="android.adservices.AD_SERVICES_CONFIG"
        android:resource="@xml/gma_ad_services_config"
        tools:replace="android:resource" />
</application>
```

The manifest entry is still required even though the Next-Gen SDK takes the app
ID in code (next step) — the UMP consent SDK reads it from here.

## 3. Initialize — Remote Config driven (recommended)

One call in your `Application` class. No hardcoded ad unit IDs: the SDK applies
its bundled defaults immediately, then fetches/activates the real
`ad_configuration` Firebase Remote Config parameter and re-applies.

```kotlin title="MyApplication.kt"
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AdMobManager.getInstance(this)
            .setPremium(false)
            .initWithRemoteConfig(
                appId = "ca-app-pub-XXXXXXXX~YYYYYYYY", // same value as the manifest entry
                isDebug = BuildConfig.DEBUG
            ) { success ->
                // SDK is configured; bundled defaults are already active
                // even if this fetch failed or timed out.
            }
    }
}
```

Note the leading `appId` parameter — the Next-Gen SDK takes the app ID
programmatically rather than reading it from the manifest, so the no-`appId`
overloads of `initialize`/`initWithRemoteConfig` exist only to throw
`IllegalStateException` pointing back here.

See [Remote Config](/remote-config) for the full JSON schema, shipping your
own default JSON, and per-placement/point control.

### Alternative: manual configuration (no Remote Config)

Still available if a project genuinely doesn't want Remote Config — set
everything through fluent setters, then call plain `initialize`:

```kotlin
val adMobManager = AdMobManager.getInstance(application)
    .setAppOpenAdResumeId("ca-app-pub-3940256099942544/9257395921")
    .setAppOpenAdStartId("ca-app-pub-3940256099942544/9257395921")
    .setShouldShowResumeAd(true)
    .setInterstitialAdMaxTime(20)
    .setInterstitialAdMinTime(10)
    .setInterstitialCounter(2)
    .setOpenAdResumeTime(5)
    .setPremium(false)

adMobManager.initialize(appId = "ca-app-pub-XXXXXXXX~YYYYYYYY") {
    adMobManager.appOpenAdLoader.loadAppOpenAd(this) { }
}
```

## 4. Consent (UMP)

Gather consent before loading ads, from your launcher `Activity`:

```kotlin
private var adsConsentManager: AdsConsentManager? = null

private fun initConsent() {
    adsConsentManager = AdsConsentManager(this)
    val canRequestAds = adsConsentManager?.canRequestAds
    if (canRequestAds == false) {
        adsConsentManager?.showGDPRConsent(this, BuildConfig.DEBUG) { consentError ->
            if (consentError != null) {
                Log.e("Consent", "Error during consent gathering: ${consentError.message}")
            }
            // proceed to initialize ads either way
        }
    } else {
        // proceed to initialize ads
    }
}
```

## 5. You're set up — what's next

- [Ad Formats](/ad-formats) — wire up each ad type at the spots your app needs them
- [Navigation Configuration](/navigation-configuration) — if this app has a splash → onboarding → main journey
- [Analytics & Consent](/analytics-consent) — event catalogue
