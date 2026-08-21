---
sidebar_position: 7
title: Frequency & Premium Controls
---

# Frequency & Premium Controls

## Premium — `AdMobManager.isPremium`

```kotlin
AdMobManager.isPremium = true      // direct
adMobManager.setPremium(true)      // fluent instance setter — mutates the same flag
```

:::warning[It's a process-wide static, not per-instance]
`isPremium` lives on `AdMobManager`'s companion object
(`@JvmStatic var isPremium: Boolean`) — every `AdMobManager` instance in the
process reads the same flag. `setPremium(Boolean)` is an instance method for
fluent chaining, but it sets that one shared value.
:::

Every public load/show entry point checks this (directly, or via
`Utilities.shouldShowAd`) and still invokes its callback with `true` when
skipping — so your navigation/unlock logic doesn't need a separate premium
branch at every call site:

```kotlin
// No premium check needed here — the loader already skips internally
// and still calls back with true so the flow proceeds.
interstitialAdLoader.loadAndShowAdForPlacement(
    activity, placementKey = AdPlacementKeys.INTERNAL_APP_INTERSTITIAL
) { proceed ->
    if (proceed) goToNextScreen()
}
```

If you're on [Remote Config](/remote-config), the global `ads_enabled: false`
kill switch behaves the same way — it's the remote equivalent of premium, for
suppressing ads without a release.

## Interstitial frequency — counter + time window

Backed by `TimeManager` (tracks elapsed time since app start) and three
`AdController` fields, all configured once and then left alone:

```kotlin
// Application.onCreate
adMobManager
    .setInterstitialCounter(3)      // show every 3rd call to showAdWithTimeAndCounter
    .setInterstitialAdMinTime(10)   // minimum seconds between interstitials
    .setInterstitialAdMaxTime(20)   // force-show once this many seconds have passed, counter or not
```

```kotlin
// Anywhere — no manual timing checks needed
interstitialAdLoader.showAdWithTimeAndCounterForPlacement(
    activity,
    AdPlacementKeys.INTERNAL_APP_INTERSTITIAL,
    showForcefully = false // false = respect the timing/counter logic above
) { }
```

Set `showForcefully = true` to bypass the pacing logic for one call (e.g. a
deliberate "watch this ad now" moment) without touching the configured
values. Call `interstitialAdLoader.resetFrequencyCap()` to clear the counter
and time state — useful after a refund or a subscription change that should
reset the user back to a clean pacing cycle.

## `AdController` reference

The shared, mutable config object every loader reads. You rarely touch it
directly — the `AdMobManager` fluent setters write to it — but it's useful to
know what's actually being configured:

| Field | Default | Set via |
|---|---|---|
| `openAdResumeTime` | `5` | `setOpenAdResumeTime` |
| `interstitialAdMinTime` | `0` | `setInterstitialAdMinTime` |
| `interstitialAdMaxTime` | `0` | `setInterstitialAdMaxTime` |
| `nativeAdRefreshTime` | `0` | `setNativeAdRefreshTime` |
| `interstitialCounter` | `0` | `setInterstitialCounter` |
| `shouldShowResumeAd` | `true` | `setShouldShowResumeAd` |
| `appOpenAdStartId` | `""` | `setAppOpenAdStartId` |
| `appOpenAdResumeId` | `""` | `setAppOpenAdResumeId` |
| `isSplash` | `false` | `setSplash` |
| `adsEnabled` | `true` | driven by Remote Config's `ads_enabled`, not a direct setter |
| `adConfig` | — | the active `AdEnvironmentConfig` once Remote Config is applied |

## Network gate

Every loader checks connectivity before issuing a request, via
`Utilities.shouldShowAd(context)` (which itself combines the premium check
above with `Utilities.isNetworkAvailable(context)`). You can check it
yourself if you want to skip showing loading UI when offline:

```kotlin
if (Utilities.isNetworkAvailable(context)) {
    bannerAdLoader.showAdaptiveBanner(activity, shimmer, frame, adId)
}
```
