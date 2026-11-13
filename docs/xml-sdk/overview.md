---
sidebar_position: 1
title: Overview
---

# Ozi AdMob SDK — Overview

`com.ozi.admob:ads` is the one library every Ozi app uses for monetization: ads,
remote-driven configuration, in-app updates, a one-call startup flow, and the
splash → onboarding → main navigation flow.
It exists so that pattern lives in **one place** instead of being re-implemented
(and drifting) app by app.

This site documents the **Next-Gen line** — the current `2.1.2`+ releases,
built on Google's [GMA Next-Gen SDK](https://developers.google.com/ad-manager/mobile-ads-sdk/android/next-gen)
(`com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk`, currently
**`1.5.0`**) rather than the legacy `com.google.android.gms:play-services-ads`.
The two ad SDKs cannot coexist in one APK, so this line excludes the legacy
dependency at the Gradle level. Adding mediation? See
[Getting Started → Picking mediation adapter versions](/xml-sdk/getting-started#picking-mediation-adapter-versions)
— adapter compatibility doesn't line up with this version number the way you'd expect.

## What it's a facade over

```
Your App
   │
   ▼
AdMobManager  ──── one singleton per process, owns every ad loader
   │
   ├── appOpenAdLoader        (GMA Next-Gen AppOpenAdPreloader)
   ├── interstitialAdLoader   (GMA Next-Gen InterstitialAdPreloader)
   ├── rewardedAdLoader       (GMA Next-Gen RewardedAdPreloader)
   ├── bannerAdLoader         (adaptive / medium-rect / collapsible)
   ├── nativeAdLoader         (GMA Next-Gen NativeAdPreloader)
   │
   ├── appUpdate              Google Play in-app updates (Remote Config controlled)
   ├── startup                Remote Config → update → consent → one callback
   │
   ├── AdController           shared mutable config (timings, ad unit IDs, splash flag)
   └── AdsRemoteConfig        Firebase Remote Config wrapper (lazy)
```

Fullscreen formats (app open, interstitial, rewarded, native) use the Next-Gen
SDK's own preloaders instead of a hand-rolled cache — the SDK's job is
placement resolution, frequency gating, analytics, and a consistent API, not
reimplementing ad caching.

## Why one SDK for every app

- **Ad IDs and pacing live in Firebase Remote Config**, not in app code. Every
  app reads the same `ad_configuration` JSON parameter shape (~28 placements +
  pacing + native ad colors). Change a value in the console and every app
  picks it up on its next fetch — no release needed. See
  [Remote Config](/xml-sdk/remote-config).
- **The splash → language → onboarding → premium → main journey** is also
  config-driven: an ordered screen list per launch type in one
  `app_navigation_configuration` parameter, so moving a screen needs no release — see
  [Navigation Configuration](/xml-sdk/navigation-configuration).
- **App start is one call.** Remote Config, the update check and the consent form run
  as a single sequence and hand control back to your app — see
  [Startup Flow](/xml-sdk/startup-flow).
- **In-app updates are a Remote Config switch** (`app_update_type`) — see
  [In-App Updates](/xml-sdk/app-update).
- **The public API is deliberately stable.** Method names, parameters, and
  placement keys don't change between patch releases, so a patch upgrade is a
  version-number bump. A minor release (like `2.1`) can carry changes that need a
  small edit; they are always listed in the upgrade notes below.

## Where things live

| Concern | Class | Package |
|---|---|---|
| Entry point / singleton | `AdMobManager` | `domain.core` |
| Shared config object | `AdController` | `domain.utils` |
| App Open + Resume | `AppOpenAdLoader`, `ResumeAdManager`, `StartAdManager` | `domain.ads.app_open` |
| Interstitial | `InterstitialAdLoader` | `domain.ads.interstitial` |
| Rewarded | `RewardedAdLoader` | `domain.ads.rewarded` |
| Banner | `BannerAdLoader` | `domain.ads.banner` |
| Native | `NativeAdLoader`, `NativeAdBuilder` | `domain.ads.native_ad` |
| Remote Config | `AdsRemoteConfig`, `AdConfigParser` | `domain.remote_config` |
| Navigation | `NavigationFlowManager`, `NavigationHost` | `domain.navigation` |
| Startup flow | `StartupFlow`, `StartupOptions`, `StartupResult` | `domain.startup` |
| In-app updates | `AppUpdateController`, `AppUpdateUiModel` | `domain.app_update` |
| Consent (UMP) | `AdsConsentManager` | `domain.consent` |
| Analytics | `AdsAnalytics`, `AnalyticsManager` | `domain.analytics`, `domain.utils` |

## Invariants every integration must respect

These hold across every app that uses the SDK — if a change you're making
seems to require breaking one of these, stop and check with the SDK owner
first:

1. **Premium check** — every public load/show entry point respects the global
   `AdMobManager.isPremium` switch and still invokes its callback with `true`
   so the caller's flow proceeds even when the ad is skipped.
2. **Ad unit ID validation** — public methods that accept a raw ad ID validate
   the `ca-app-pub-...` format; invalid IDs throw from `AdMobManager` setters
   but are only logged + skipped inside loaders.
3. **Interstitial has two independent flows** — `loadAd`/`showAd` and
   `loadAndShowAd` keep separate ad references and loading flags so they can't
   race each other.
4. **`setSplash(true)` must be turned back off** in the splash screen's
   `onDestroy`, or automatic resume ads never fire again.
5. **`setDeferAdsInit(true)` needs an `initializeAds()` call.** With it, ads are not
   initialized until your app does it — normally in the startup callback, whatever
   the consent result. See [Startup Flow](/xml-sdk/startup-flow#what-setdeferadsinit-does).

## What's new in 2.1.2

Everything since `2.0.5`. Older versions are in the [release notes](/changelog).

| Change | Details |
|---|---|
| **Startup flow** | One call runs Remote Config → update check → consent form → callback. New `ads.startup.start(...)`, `setDeferAdsInit(true)` and `initializeAds()` — see [Startup Flow](/xml-sdk/startup-flow) |
| **In-app updates** | Switch Play updates on from Remote Config with `app_update_type` (`0` flexible, `1` immediate). Background and manual checks, a customizable dialog — see [In-App Updates](/xml-sdk/app-update) |
| **Consent reworked** | Never stops the ads flow: granted, declined, timed out or failed, the app carries on. The form load is capped and a late form is never shown — see [Analytics & Consent](/xml-sdk/analytics-consent) |
| **Navigation = journey lists** | `app_navigation_configuration` (`config_version` 2): an ordered screen list per launch type, an ad before any step, a separate `premium_offer` screen, and a default JSON asset — see [Navigation Configuration](/xml-sdk/navigation-configuration) |
| **Banner caching** | A loaded banner is reused for `banner_ad_refresh_time` seconds (default 15; it used to be four hours) — see [Banner Ads](/xml-sdk/ad-formats/banner#banner-caching) |

### Upgrading from 2.0.5

Nothing needs to change unless it is on this list. The startup flow, in-app updates
and the consent methods are opt-in.

1. **Navigation — the one breaking change.**
   - The SDK now reads **`app_navigation_configuration`**, not `navigation_configuration`.
     Create the new parameter in the Firebase console (copy `navigation_config_template.json`),
     and add a `default_navigation_configuration.json` asset passed with
     `setNavigationConfigurationAsset`. Keep the old parameter while older app versions
     are still in use.
   - If you built `NavigationConfig(...)`, `SplashConfig(firstLaunchFlow = …)`,
     `OnboardingConfig` or `PremiumConfig` **in code**, it no longer compiles. Use the default
     JSON file, or the new `Flows` / `FlowStep` shape. The old-to-new mapping is in
     [Navigation Configuration → Migrating from version 1](/xml-sdk/navigation-configuration#migrating-from-version-1).
   - A `NavigationHost` you already wrote, in Kotlin or Java, keeps compiling: `openPremiumOffer` has a default that calls `openPremium`.
2. **Banners are cached for 15 s instead of 4 hours**, so apps that move between screens
   sharing a banner ad unit make more banner requests. Tune `banner_ad_refresh_time`.
3. **A new transitive dependency**, `com.google.android.play:app-update:2.1.0`, comes in with
   the SDK. You don't declare it; nothing is added to the manifest.
4. The Next-Gen SDK is still `1.5.0`, as in `2.0.5`.

## Next steps

- New integration → [Getting Started](/xml-sdk/getting-started)
- Already integrated, adding a format → [Ad Formats](/xml-sdk/ad-formats)
- Changing ad IDs/pacing without a release → [Remote Config](/xml-sdk/remote-config)
- Wiring the splash/onboarding journey → [Navigation Configuration](/xml-sdk/navigation-configuration)
- Remote Config, update and consent in one call → [Startup Flow](/xml-sdk/startup-flow)
- Offering Play updates → [In-App Updates](/xml-sdk/app-update)
