---
sidebar_position: 2
title: Getting Started
---

# Getting Started

## 1. Add the dependency

Published to the same internal Maven repo as the XML SDK, but a **separate
repository path and Maven coordinate** — the two SDKs are versioned
independently.

```kotlin title="settings.gradle.kts"
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("sftp://172.16.3.122:22/home/altaf/maven-repo-compose")
            credentials {
                username = System.getenv("OZI_MAVEN_USER") ?: providers.gradleProperty("ozi.maven.user").orNull
                password = System.getenv("OZI_MAVEN_PASSWORD") ?: providers.gradleProperty("ozi.maven.password").orNull
            }
        }
    }
}
```

:::info[Get the credentials from your lead]
Same account as the XML SDK's Maven repo, different path (`maven-repo-compose`
instead of `maven-repo`). Put them in your own `~/.gradle/gradle.properties`,
never in a project repo.
:::

```kotlin title="app/build.gradle.kts"
dependencies {
    implementation("com.ozi.admob.nextgen.compose:ads:1.0.1") // check the latest published version with your lead
}
```

:::warning[minSdk 26, and no legacy ads dependency]
This SDK requires `minSdk = 26` (one higher than the XML Next-Gen line's 24).
It also cannot coexist with `com.google.android.gms:play-services-ads` in the
same APK — exclude it if anything else pulls it in transitively:

```kotlin title="app/build.gradle.kts"
configurations.configureEach {
    exclude(group = "com.google.android.gms", module = "play-services-ads")
    exclude(group = "com.google.android.gms", module = "play-services-ads-lite")
}
```
:::

## 2. Manifest

Same as the XML SDK — the app ID is still passed programmatically (next
step), but the manifest entry is required because the UMP consent SDK reads
it from here:

```xml title="AndroidManifest.xml"
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<application>
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-XXXXXXXX~YYYYYYYY" />
</application>
```

## 3. Gather consent, then initialize

Unlike the XML SDK's samples, this SDK's own sample app doesn't call
`initWithRemoteConfig` from the `Application` class at all — `AdsApplication`
only constructs `AdMobManager.getInstance(this)` early (so its
`ProcessLifecycleOwner` observer is registered), and defers **consent, then
init** entirely to the splash screen, since consent must be resolved before
the first ad request:

```kotlin title="SplashScreen.kt — the real sequence from the sample app"
val ads = remember { AdMobManager.getInstance(application) }
val consent = remember { AdsConsentManager.getInstance(context) }

DisposableEffect(Unit) {
    ads.setSplash(true)
    onDispose { ads.setSplash(false) } // must run, or resume ads never fire again
}

LaunchedEffect(Unit) {
    consent.gatherConsent(activity = activity) { error ->
        // proceed regardless of consentError — the SDK's bundled defaults
        // still apply if consent gathering itself fails

        val defaults = RemoteConfigDefaults.Companion.Builder()
            .setAdConfigurationAsset(activity, "ads_remote_config_defaults.json")
            .build()

        ads.initWithRemoteConfig(
            appId = "ca-app-pub-XXXXXXXX~YYYYYYYY",
            isDebug = BuildConfig.DEBUG,
            defaults = defaults,
            // Optional — only needed if your Firebase parameter isn't named
            // "ad_configuration" (RemoteConfigKeys.AD_CONFIGURATION's default).
            configKey = "ad_configuration",
            fetchTimeoutMillis = 8_000L,
        ) { fetched ->
            // Both settle the same way: ads already work on bundled/app-supplied
            // defaults even if `fetched` is false (timeout or no Firebase config).
            ads.interstitialAdLoader.loadAdForPlacement(
                placementKey = AdPlacementKeys.SPLASH_INTERSTITIAL,
                point = "splash",
            ) { }
            ads.appOpenAdLoader.loadStartAd { }
        }
    }
}
```

Note the `RemoteConfigDefaults.Companion.Builder()` spelling — `Builder` is
nested inside `RemoteConfigDefaults`'s companion object, so Kotlin needs the
explicit `.Companion.` in the middle; this isn't a typo.

`AdsConsentManager.gatherConsent` (not `showGDPRConsent` — different name
from the XML SDK):

```kotlin
val consent = AdsConsentManager.getInstance(context)

if (!consent.canRequestAds) {
    consent.gatherConsent(activity = activity) { error ->
        // proceed to initialize ads either way
    }
} else {
    // already have consent — proceed to initialize ads
}
```

## 4. `initWithRemoteConfig` reference

```kotlin
fun initWithRemoteConfig(
    appId: String,
    isDebug: Boolean = false,
    defaults: RemoteConfigDefaults = RemoteConfigDefaults(),
    configKey: String = RemoteConfigKeys.AD_CONFIGURATION, // "ad_configuration"
    fetchTimeoutMillis: Long = 8_000L,
    onComplete: ((Boolean) -> Unit)? = null,
): AdMobManager
```

Same shape as the XML SDK: applies defaults immediately, fetches Firebase in
the background, races a timeout, and re-applies if the fetch lands after the
timeout already fired. The no-`appId` overloads of `initialize`/
`initWithRemoteConfig` both throw `IllegalStateException` — they exist only
to fail loudly for anyone expecting the legacy no-app-ID API.

## 5. You're set up — what's next

- [Ad Formats](/compose-sdk/ad-formats) — wire up each format at the screens your app needs them
- [Loading Dialog](/compose-sdk/loading-dialog) — show a dialog while interstitial/rewarded ads load
- [Remote Config](/compose-sdk/remote-config) — the JSON schema and per-point blocking
