---
sidebar_position: 1
title: Overview
---

# Ozi AdMob SDK — Overview

`com.ozi.admob:ads` is the one library every Ozi app uses for monetization: ads,
remote-driven configuration, and the splash → onboarding → main navigation flow.
It exists so that pattern lives in **one place** instead of being re-implemented
(and drifting) app by app.

This site documents the **Next-Gen line** — the current `2.0.3`+ releases,
built on Google's [GMA Next-Gen SDK](https://developers.google.com/ad-manager/mobile-ads-sdk/android/next-gen)
(`com.google.android.libraries.ads.mobile.sdk`) rather than the legacy
`com.google.android.gms:play-services-ads`. The two ad SDKs cannot coexist in one
APK, so this line excludes the legacy dependency at the Gradle level.

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
  [Remote Config](/remote-config).
- **The splash → language → onboarding → main/premium journey** is also
  config-driven, from one `navigation_configuration` parameter — see
  [Navigation Configuration](/navigation-configuration).
- **The public API is deliberately stable.** Method names, parameters, and
  placement keys don't change between patch releases, so upgrading is a
  version-number bump, not a rewrite.

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

## Next steps

- New integration → [Getting Started](/getting-started)
- Already integrated, adding a format → [Ad Formats](/ad-formats)
- Changing ad IDs/pacing without a release → [Remote Config](/remote-config)
- Wiring the splash/onboarding journey → [Navigation Configuration](/navigation-configuration)
