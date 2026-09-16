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
    implementation("com.ozi.admob.nextgen.compose:ads:1.0.2") // check the latest published version with your lead
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

### Which Next-Gen SDK version this pulls in

`com.ozi.admob.nextgen.compose:ads:1.0.2` depends on
`com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk:1.3.1` — the same
Next-Gen SDK version the XML SDK currently uses. You don't declare it
yourself, but you need this number when picking mediation adapters.

### Picking mediation adapter versions

Same rule as the XML SDK: **a mediation adapter's stated minimum SDK version
is in the legacy `play-services-ads` numbering scheme (e.g. "requires Google
Mobile Ads SDK 22.x"), not this SDK's `ads-mobile-sdk` version (`1.3.1`)** —
Google doesn't publish a Next-Gen-specific compatibility table, so don't try
to match the two numbers against each other.

What actually works:

1. Keep the `play-services-ads`/`play-services-ads-lite` exclude above — every mediation adapter pulls the legacy SDK back in transitively otherwise.
2. Pick the **latest published version** of each adapter you need — adapters are maintained forward-compatible with the current Next-Gen SDK; older adapter releases predating Next-Gen support are the risk, not newer ones.
3. Verify at runtime, since there's no compatibility table to check against instead:
   ```kotlin
   MobileAds.initialize(context, InitializationConfig.Builder(appId).build()) { status ->
       status.adapterStatusMap.forEach { (adapterClass, adapterStatus) ->
           Log.d("Mediation", "$adapterClass -> ${adapterStatus.initializationState}")
       }
   }
   ```
   and after an ad loads, confirm the network you expect actually served it via `ad.responseInfo?.mediationAdapterClassName` — an adapter that "initializes" but never appears here isn't actually compatible, regardless of what its own version number implies.
4. Confirm the network has a Next-Gen adapter published **at all** before committing to it for a revenue-earning app — not every legacy mediation partner has shipped one yet.

### Standard mediation networks

Every Ozi project should include these networks. **Versions are deliberately
not pinned here** — adapter releases move independently of this SDK. Get the
current version for each, matched against the Next-Gen SDK version above,
from the [official AdMob mediation page](https://developers.google.com/admob/android/mediation)
before adding any of these:

```kotlin title="app/build.gradle.kts"
dependencies {
    implementation("com.google.ads.mediation:applovin:<see official docs>")
    implementation("com.google.ads.mediation:vungle:<see official docs>")
    implementation("com.google.ads.mediation:facebook:<see official docs>")
    implementation("com.google.ads.mediation:mintegral:<see official docs>")
    implementation("com.google.ads.mediation:pangle:<see official docs>")
    implementation("com.unity3d.ads:unity-ads:<see official docs>")     // Unity's own SDK
    implementation("com.google.ads.mediation:unity:<see official docs>") // the AdMob adapter for it
}
```

:::warning[Meta/Facebook — verify Next-Gen support before relying on it]
Flagged above (point 4) as not shipping a Next-Gen adapter as of this SDK's
last verified check. Confirm on the official mediation page and via the
runtime check above that it's actually initializing and serving before
treating it as production-ready — don't assume it works because it's in
this list.
:::

Pangle needs its own Maven repository in addition to the adapter dependency
— add it to the **existing** `dependencyResolutionManagement` block from
step 1, not a separate `allprojects { repositories { ... } }` block. This
project's `repositoriesMode` is `FAIL_ON_PROJECT_REPOS`, which specifically
*rejects* per-module repository declarations — the centralized block is the
only place a new repository can go:

```kotlin title="settings.gradle.kts"
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url = uri("https://artifact.bytedance.com/repository/pangle/") } // Pangle adapter
        maven {
            url = uri("sftp://172.16.3.122:22/home/altaf/maven-repo-compose")
            credentials { /* … */ }
        }
    }
}
```

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
