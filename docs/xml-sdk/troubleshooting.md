---
sidebar_position: 8
title: Troubleshooting
---

# Troubleshooting

## Ads not showing — checklist

1. Verify internet connection (`Utilities.isNetworkAvailable`)
2. Check premium status: `AdMobManager.isPremium` — remember it's a
   process-wide static, see [Frequency & Premium Controls](/xml-sdk/frequency-premium-controls)
3. Use test ad unit IDs in debug builds (below)
4. Check logs: `adb logcat | grep "Monetization"`
5. Verify the AdMob App ID in `AndroidManifest.xml` matches what you passed as `appId` to `initialize`/`initWithRemoteConfig`
6. Confirm the ads SDK was actually initialized. With `setDeferAdsInit(true)`, `initializeAds()` must have run — look for `Next-Gen SDK initialized` in Logcat (see [Startup Flow](/xml-sdk/startup-flow#what-setdeferadsinit-does))

## Common issues

#### Interstitial not showing
- Check `interstitialCounter`/min/max time configuration — `showAdWithTimeAndCounter` may be correctly *not* showing because the pacing window hasn't been hit yet
- Verify the `showForcefully` argument matches your intent
- Confirm you're not accidentally mixing the `loadAd`/`showAd` flow with `loadAndShowAd` — they track separate loaded-ad state

#### Native ad not loading
- Layout is missing `ad_media`, or another required ID doesn't match exactly — see [Native Ads](/xml-sdk/ad-formats/native)
- Root tag / `MediaView` still point at the legacy `com.google.android.gms.ads.nativead` package instead of `com.google.android.libraries.ads.mobile.sdk.nativead`
- Prefer the preload pattern for more reliable timing on screens reached right after another one

#### Banner not appearing
- `FrameLayout` container is collapsed/`GONE` — check whether the placement is disabled in Remote Config (banners collapse their container automatically when disabled)
- Shimmer layout isn't set up, so there's no visible loading state before the ad arrives
- Network unavailable
- Inline adaptive banner (`adSizeType = INLINE_ADAPTIVE`) clipped or leaving a gap — the container has a fixed height; use `wrap_content`, since the real height is only known after load. See [Banner size types](/xml-sdk/ad-formats/banner#banner-size-types)
- A collapsible banner shows at the large-anchored size when you asked for inline — expected: collapsible banners fall back to `LARGE_ANCHORED` for `INLINE_ADAPTIVE` (check Logcat for the warning)
- The same banner comes back instantly for a few seconds — that is the cache: a loaded banner is reused until it is older than `banner_ad_refresh_time` (default 15 s). See [Banner caching](/xml-sdk/ad-formats/banner#banner-caching)

#### Rewarded ad loads twice, or the button tap waits
- Since `2.0.5` a rewarded ad is never requested twice for one ad unit — if you still see two requests, check they aren't for **different placements** resolving to different ad unit IDs
- A tap that "waits" is `loadAndShowAdForPlacement` joining a load already in flight (capped by `timeoutMillis`, or 20s with none) — use `isAdLoadingForPlacement` to confirm. See [Rewarded Ads → How loading and caching work](/xml-sdk/ad-formats/rewarded#how-loading-and-caching-work)

#### Ads never initialize after adopting the startup flow
- `setDeferAdsInit(true)` is set but nothing calls `initializeAds()` — it must be called in the startup callback, in every case (see [Startup Flow](/xml-sdk/startup-flow#what-setdeferadsinit-does))
- The startup callback never ran — filter Logcat for `StartupFlow` and look for the final `startup: done` line. A splash that is destroyed mid-flow re-attaches on the next `start`
- `initializeAds()` threw `IllegalStateException` — `initWithRemoteConfig(appId, …)` was never called, so the SDK has no app ID; call it first or use `initialize(appId)`

#### The startup flow runs on defaults (`remoteConfigFetched = false`)
- `startup.start(...)` ran before `initWithRemoteConfig` — there was no fetch to wait for, so the step ended immediately
- The fetch didn't finish within `remoteConfigTimeoutMs` (6 s), or Firebase isn't configured (no `google-services.json`). The SDK carries on with the cached or default values and applies the fetch when it lands
- Reading the navigation config before the startup callback — it still holds the in-code defaults (not your default JSON file) until the config is loaded

#### The consent form shows on every launch
- `consentTestMode = true` in `StartupOptions`, or `isTest = true` in a manual call, resets the saved consent and forces an EEA test setup on every run. Remove it for real builds

#### The consent form never shows
- Google says no form is required (the user is outside the EEA/UK, or already answered). Check `result.consentStatus`: `NOT_REQUIRED` or `OBTAINED` is normal
- `show_consent` is `false` in `app_navigation_configuration`, or `askConsent = false` — the outcome is `SKIPPED`
- The form couldn't load within `consentFormLoadTimeoutMs` (8 s) — the outcome is `TIMED_OUT`, and the form is never shown late

#### The in-app update never appears
- The build wasn't installed by Google Play. `adb`, Android Studio and sideloaded builds always report "no update" — see [In-App Updates → Testing a real update](/xml-sdk/app-update#testing-a-real-update)
- `app_update_type` is `-1` or missing, or it's set in the wrong block — a release build reads `release_ad_configuration`
- Play's `versionCode` isn't higher than the installed one, or the two builds are signed with different keys
- Another update dialog was already on screen (the call is ignored and reports `false`)
- In the startup flow `updateOutcome = FAILED` means Play didn't answer within 5 s. Filter Logcat for `AppUpdateController`

#### Navigation doesn't follow the JSON I edited
- You edited `navigation_configuration`. Version `2.1.x` reads **`app_navigation_configuration`**, and the old key is ignored
- Use `config_version` `2`; a value of `1` or lower is rejected. A version-1 value (the `*_flow` integers) is rejected, and `nav.logConfig()` shows `source: DEFAULT JSON …` or `APP DEFAULT (invalid JSON)` instead of `REMOTE CONFIG`
- Release builds cache Remote Config for 12 h, so a console change can take that long to arrive
- A malformed or version-1 fetched value falls back to the default JSON asset if that parses, otherwise to the in-code config (`source: APP DEFAULT (invalid JSON)`). It is logged, not silent — look for the `NavigationConfigParser` warning

#### A journey skips a screen or opens it out of order
- `premium` and `premium_offer` are skipped for premium users (`AdMobManager.isPremium`)
- `language` and `onboarding` are skipped once done, unless the step sets `skip_if_done: false`
- The step has `enabled: false`, or `screens.<screen>.<launch>.enabled` is `false`
- A screen listed twice keeps only its first step; steps after `main` are never reached; an unknown screen name is logged and skipped
- The first-launch list is used until **both** language and onboarding are done. Use `nav.resetLaunchState()` to retest

#### A journey stalls on an ad step
- Your `NavigationHost` didn't call the continuation. `showInterstitial` and `showAppOpenAd` must call `onComplete` in every case — shown, skipped, failed, premium
- The interstitial is disabled or blocked: the placement's `enable` is `false`, or the step's point (`before_main`, `close_premium`, …) is in its `points` block-list. The continuation must still run

#### Remote Config values look stale
- Release builds cache Remote Config for 12h — uninstall/reinstall or wait out the cache during testing; debug builds fetch instantly (0s interval)
- Confirm you bumped `config_version` in the JSON and re-published in the Firebase console — it's the fastest way to confirm a fetch actually picked up your change
- Malformed JSON in the console makes the SDK fall back to the bundled default silently — check Logcat for a parse warning, fix, and re-publish

#### A placement resolves to an empty ad ID
- The key is missing from that environment block (`debug_ad_configuration` / `release_ad_configuration`), or its `enable` is `false` — check with `mgr.isEnabled(key)` before loading
- It works from one screen but not another — that call site's `point` is probably listed in the placement's `points` block-list; check the `AdPoints` Logcat tag or `mgr.isEnabled(key, point)`

## Logs

Every SDK log is tagged `Monetization`:

```bash
adb logcat | grep "Monetization"

# Narrower, per-loader tags
adb logcat | grep "InterstitialAdLoader"
adb logcat | grep "BannerAdLoader"
adb logcat | grep "NativeAd"
adb logcat | grep "AppOpenAdLoader"
adb logcat | grep "AdsRemoteConfig"
adb logcat | grep "StartupFlow"
adb logcat | grep "AppUpdateController"
adb logcat | grep "AdsConsentManager"
adb logcat | grep "NavigationFlowManager"
```

## Test ad unit IDs

Never ship these — use only during development:

| Format | Test ID |
|---|---|
| App Open | `ca-app-pub-3940256099942544/3419835294` |
| Banner | `ca-app-pub-3940256099942544/9214589741` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |
| Native | `ca-app-pub-3940256099942544/2247696110` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` |

## Still stuck?

Check the sample app under `app/` in the SDK repo for a complete working
integration of every format, or ask in the team channel with the Logcat
output from `adb logcat | grep "Monetization"` attached.
