---
sidebar_position: 1
title: Overview
---

# Ozi AdMob SDK — Overview

`com.ozi.admob:ads` is the one library every Ozi app uses for monetization: ads,
remote-driven configuration, and the splash → onboarding → main navigation flow.
It exists so that pattern lives in **one place** instead of being re-implemented
(and drifting) app by app.

This site documents the **Next-Gen line** — the current `2.0.5`+ releases,
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
- **The splash → language → onboarding → main/premium journey** is also
  config-driven, from one `navigation_configuration` parameter — see
  [Navigation Configuration](/xml-sdk/navigation-configuration).
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

## What's new in 2.0.5

| Change | Details |
|---|---|
| **Three banner size types** | Adaptive and collapsible banners take a new `adSizeType` (`LARGE_ANCHORED` default, `ANCHORED_ADAPTIVE`, `INLINE_ADAPTIVE`) — see [Banner Ads](/xml-sdk/ad-formats/banner#banner-size-types) |
| **Rewarded ad caching fixed** | One request per ad unit, ever — loaded/loading state is tracked per ad unit, so `loadAd` then `loadAndShowAd` shows the warm ad instead of loading a second one — see [Rewarded Ads](/xml-sdk/ad-formats/rewarded#how-loading-and-caching-work) |
| **Next-Gen SDK `1.3.1` → `1.5.0`** | The underlying `ads-mobile-sdk` moved up two minor versions; the exclude of the legacy `play-services-ads` is unchanged |

Upgrading from `2.0.4` is a version-number bump for Kotlin code — the default
banner size is the same one `2.0.4` already used, so existing banner calls
render exactly as before. The one exception is **Java** code that passes an
`onAdLoaded` listener to a banner method: it must now also pass the two new
parameters first (see
[Banner Ads → Full API](/xml-sdk/ad-formats/banner#full-api)). Because the Next-Gen SDK itself moved, re-run the runtime
mediation check from
[Getting Started → Picking mediation adapter versions](/xml-sdk/getting-started#picking-mediation-adapter-versions)
once after upgrading, to confirm every adapter still initializes.

## Next steps

- New integration → [Getting Started](/xml-sdk/getting-started)
- Already integrated, adding a format → [Ad Formats](/xml-sdk/ad-formats)
- Changing ad IDs/pacing without a release → [Remote Config](/xml-sdk/remote-config)
- Wiring the splash/onboarding journey → [Navigation Configuration](/xml-sdk/navigation-configuration)
