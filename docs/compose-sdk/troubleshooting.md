---
sidebar_position: 5
title: Troubleshooting
---

# Troubleshooting

## Ads not showing — checklist

1. Verify internet connection — every loader gates on `Utilities.shouldShowAd(context)` before requesting
2. Check premium status: `AdMobManager.isPremium` — process-wide static, same as the XML SDK
3. Confirm consent has resolved (`AdsConsentManager.canRequestAds`) before `initWithRemoteConfig` runs
4. Verify the AdMob App ID passed to `initWithRemoteConfig`/`initialize` matches the manifest's `APPLICATION_ID` meta-data
5. Check Logcat — every SDK log line is prefixed `Monetization :-`

## Common issues

#### Interstitial/Rewarded not showing
- Confirm you're not mixing `loadAdForPlacement`/`showAdForPlacement` with `loadAndShowAdForPlacement` for the same placement expecting shared warm-ad state — these SDK's loaders use one-shot loads per flow, not a shared cache
- For interstitial, check `showForcefully` — `showAdForPlacement` defaults to `false` (pacing gate applies) while `loadAndShowAdForPlacement`/`showAndLoadAdForPlacement` default to `true`
- Rewarded's disabled/blocked placements report `false`, not `true` — that's by design (no free rewards), not a bug

#### Banner renders nothing
- Check whether the placement is disabled or the `point` is blocked in Remote Config — `BannerAd()` renders nothing (no placeholder, no space) once loading finishes and failed, by design
- Make sure the Composable has a constrained width (e.g. `Modifier.fillMaxWidth()`) — sizing derives from `BoxWithConstraints`, not the window

#### Native ad not loading / clicks not registering
- If clicks silently don't count, check every clickable inside `NativeAdCallToActionView` calls the `performAdClick` lambda it's handed — a plain `Button(onClick = { ... })` that ignores it will render fine but never fire an ad click
- `NativeAdMediaView` is required if you show media at all — it's a real SDK view, not optional
- Check `refreshMillis` (or the placement's `native_ad_refresh_time`) isn't `0` if you expected auto-refresh

#### Resume ad never fires
- Check `setSplash(false)` actually ran — a `DisposableEffect` that never disposes (e.g. recomposition churn keeping the key alive) leaves `isSplash = true` forever
- Confirm `setShouldShowResumeAd(true)` was called and `openAdResumeTime` has actually elapsed in the background

## Logs

```bash
adb logcat | grep "Monetization"

# Narrower, per-loader tags
adb logcat | grep "InterstitialAdLoader"
adb logcat | grep "RewardedAdLoader"
adb logcat | grep "ResumeAdManager"
adb logcat | grep "StartAdManager"
adb logcat | grep "AdPoints"
```

## Test ad unit IDs

Same Google test IDs as the XML SDK — never ship these:

| Format | Test ID |
|---|---|
| App Open | `ca-app-pub-3940256099942544/3419835294` |
| Banner | `ca-app-pub-3940256099942544/9214589741` |
| Interstitial | `ca-app-pub-3940256099942544/1033173712` |
| Native | `ca-app-pub-3940256099942544/2247696110` |
| Rewarded | `ca-app-pub-3940256099942544/5224354917` |

## Still stuck?

Check the sample app under `app/` in the `NextGenComposeAds` repo for a
complete working integration of every format, or ask in the team channel with
the `Monetization`-filtered Logcat output attached.
