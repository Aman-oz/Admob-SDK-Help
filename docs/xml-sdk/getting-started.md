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
    implementation("com.ozi.admob:ads:2.0.4") // check the latest published version with your lead
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

### Which Next-Gen SDK version this pulls in

`com.ozi.admob:ads:2.0.4` depends on Google's
`com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk:1.3.1` — that's
the actual ad-serving SDK underneath this facade. You don't declare it
yourself (it comes in transitively via `api(...)` in the library), but you
need this number when picking mediation adapters — see below.

### Picking mediation adapter versions

If you add any mediation network (AppLovin, Meta, Unity Ads, etc.), the
version you pick has to be compatible with the Next-Gen SDK underneath —
picking an adapter version at random is the single most common cause of a
mediation network that "initializes" but never actually serves an ad.

:::warning[Adapters version against the *legacy* SDK number, not `ads-mobile-sdk`'s]
Every mediation adapter's own changelog states a minimum requirement like
*"requires Google Mobile Ads SDK 22.x or higher"* — that version number is
from the **legacy** `play-services-ads` numbering scheme, not the Next-Gen
`ads-mobile-sdk` version (`1.3.1`) this SDK actually uses. Google doesn't
publish a separate Next-Gen-specific compatibility table — Next-Gen SDK
ships the classes adapters expect as a forward-compatible stand-in for the
legacy SDK, and there's no simple "1.3.1 = legacy X.Y.Z" conversion to look
up. Don't try to match version *numbers* across the two schemes — they're
unrelated.
:::

What actually works, in order:

1. **Always keep the `play-services-ads`/`play-services-ads-lite` exclude above** — every mediation adapter you add will try to pull the legacy SDK back in transitively, and it will silently coexist-crash or duplicate-symbol-fail if you don't.
2. **Pick the latest published version of each adapter you need.** Adapter maintainers keep them forward-compatible with the current Next-Gen SDK going forward; older adapter versions predating Next-Gen SDK support are the ones actually at risk, not newer ones.
3. **Verify empirically, not by reading version numbers** — Google's own guidance for Next-Gen mediation is to check this at runtime rather than trust a compatibility table that doesn't exist:
   ```kotlin
   MobileAds.initialize(context, InitializationConfig.Builder(appId).build()) { status ->
       status.adapterStatusMap.forEach { (adapterClass, adapterStatus) ->
           Log.d("Mediation", "$adapterClass -> ${adapterStatus.initializationState}, ${adapterStatus.description}")
       }
   }
   // After an ad loads:
   Log.d("Mediation", "Served by: ${ad.responseInfo?.mediationAdapterClassName}")
   ```
   If an adapter's `initializationState` never reaches ready, or `mediationAdapterClassName` never shows that network even though it's configured, that adapter version isn't actually compatible — try the latest release of that adapter before assuming the network itself is the problem.
4. **Before migrating a revenue-earning app, confirm the network has a Next-Gen adapter at all** — not every legacy mediation partner has shipped one. The Meta Audience Network adapter that the legacy `1.4.x` line ships, for example, is **not** a dependency on this Next-Gen line — check the [mediation network list](https://developers.google.com/admob/android/choose-networks) for Next-Gen support before committing to a network for a live app.

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

See [Remote Config](/xml-sdk/remote-config) for the full JSON schema, shipping your
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

- [Ad Formats](/xml-sdk/ad-formats) — wire up each ad type at the spots your app needs them
- [Navigation Configuration](/xml-sdk/navigation-configuration) — if this app has a splash → onboarding → main journey
- [Analytics & Consent](/xml-sdk/analytics-consent) — event catalogue
