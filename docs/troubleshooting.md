---
sidebar_position: 8
title: Troubleshooting
---

# Troubleshooting

## Ads not showing — checklist

1. Verify internet connection (`Utilities.isNetworkAvailable`)
2. Check premium status: `AdMobManager.isPremium` — remember it's a
   process-wide static, see [Frequency & Premium Controls](/frequency-premium-controls)
3. Use test ad unit IDs in debug builds (below)
4. Check logs: `adb logcat | grep "Monetization"`
5. Verify the AdMob App ID in `AndroidManifest.xml` matches what you passed as `appId` to `initialize`/`initWithRemoteConfig`
6. Confirm consent has been resolved (`canRequestAds`) before initializing ads

## Common issues

#### Interstitial not showing
- Check `interstitialCounter`/min/max time configuration — `showAdWithTimeAndCounter` may be correctly *not* showing because the pacing window hasn't been hit yet
- Verify the `showForcefully` argument matches your intent
- Confirm you're not accidentally mixing the `loadAd`/`showAd` flow with `loadAndShowAd` — they track separate loaded-ad state

#### Native ad not loading
- Layout is missing `ad_media`, or another required ID doesn't match exactly — see [Native Ads](/ad-formats/native)
- Root tag / `MediaView` still point at the legacy `com.google.android.gms.ads.nativead` package instead of `com.google.android.libraries.ads.mobile.sdk.nativead`
- Prefer the preload pattern for more reliable timing on screens reached right after another one

#### Banner not appearing
- `FrameLayout` container is collapsed/`GONE` — check whether the placement is disabled in Remote Config (banners collapse their container automatically when disabled)
- Shimmer layout isn't set up, so there's no visible loading state before the ad arrives
- Network unavailable

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
