---
sidebar_position: 4
title: Remote Config
---

# Remote Config

Same JSON schema, same idea as the [XML SDK's Remote Config](/xml-sdk/remote-config)
— one Firebase Remote Config parameter (default name `ad_configuration`, via
`RemoteConfigKeys.AD_CONFIGURATION`, overridable with the `configKey`
parameter on `initWithRemoteConfig`) carrying `debug`/`release` environment
blocks. Every placement, pacing value, and the `native_ad_design` section are
**structurally identical** to the XML SDK — same field names, same defaults —
so one console entry can drive both an XML app and a Compose app at once.

## Loading by placement key — the only path here

Unlike the XML SDK (which keeps a raw-ad-unit-ID method alongside each
`...ForPlacement` one), every loader in this SDK is placement-first with no
documented raw-ID alternative. Every method takes an `AdPlacementKeys`
constant and resolves the real ad unit ID internally:

```kotlin
interstitialAdLoader.loadAndShowAdForPlacement(
    activity = activity,
    placementKey = AdPlacementKeys.INTERNAL_APP_INTERSTITIAL,
    point = "settings",
) { proceed -> if (proceed) goToNextScreen() }
```

### Disabled-placement callback semantics

| Format | Method | Callback when disabled/blocked |
|---|---|---|
| Interstitial | `loadAdForPlacement` | `false` |
| Interstitial | `showAdForPlacement`, `loadAndShowAdForPlacement`, `showAndLoadAdForPlacement` | **`true`** — navigation proceeds |
| Rewarded | `loadAdForPlacement` | `false` |
| Rewarded | `showAdForPlacement`, `loadAndShowAdForPlacement` | **`false`** — unlike interstitial, no ad means no reward |
| Banner | `BannerAd()` | `onLoaded(false)`, renders nothing (no reserved space) |
| Native | `NativeAd()`, `NativeAdCard()` | `onLoaded(false)`, renders nothing |
| App Open | `loadStartAd`/`loadResumeAd`/`showStartAdIfAvailable`/`showResumeAdIfAvailable` | `false` (no placement key at all — see [App Open & Resume](/compose-sdk/ad-formats/app-open-resume)) |

This is the same asymmetry the XML SDK has: full-screen **show** flows
(interstitial) report `true` so a navigation flow isn't blocked by a disabled
ad; rewarded's show flows report `false` because reporting `true` would hand
out a free reward.

## Per-point control

A placement (one ad unit ID) reused across several screens can be blocked at
*specific* call sites via an optional `point` — a free-form token you choose
— without touching the other call sites sharing that placement:

```kotlin
// Placement is reused everywhere, but Remote Config lists "settings" in
// internal_app_interstitial.points, so just this call site is blocked.
interstitialAdLoader.loadAndShowAdForPlacement(
    activity = activity,
    placementKey = AdPlacementKeys.INTERNAL_APP_INTERSTITIAL,
    point = "settings",
) { proceed -> if (proceed) goToNextScreen() }
```

```json title="ad_configuration → internal_app_interstitial"
{
  "enable": true,
  "adId": "ca-app-pub-xxx/111",
  "points": ["settings", "editor"]
}
```

Rules (identical to the XML SDK): listed → blocked, not listed / no `points`
array / no `point` passed → shows. Tokens are normalized (`trim().lowercase()`)
on both sides. `AdMobManager.observedPoints()` returns every
`"placement:point"` pair seen at runtime, for a debug screen.

## Native ad design (light/dark)

`NativeAd()`/`NativeAdCard()` resolve the palette automatically via
`AdMobManager.nativeColorsFor(placementKey, isDark)` — `isDark` defaults to
`isSystemInDarkTheme()` unless you pass `isDarkTheme` explicitly (the sample
app passes its own `LocalIsDarkTheme.current` so the ad matches the app's
in-app theme toggle rather than the OS setting). `native_ad_design.default`
supplies the palette for every native placement; `native_ad_design.overrides.<placement>`
replaces it for one placement.

## Pacing values

Same fields, same effect as the XML SDK:

| JSON key | Effect |
|---|---|
| `ads_enabled` | `false` → all ads suppressed |
| `interstitial_count` / `interstitial_delay_min_sec` / `interstitial_delay_max_sec` | Read by `AdController.interstitialCounter`/`interstitialAdMinTime`/`interstitialAdMaxTime`, applied automatically inside `showAdForPlacement`/`loadAndShowAdForPlacement`/`showAndLoadAdForPlacement` whenever `showForcefully = false` — there's no separate "with pacing" method name here the way the XML SDK has `showAdWithTimeAndCounter`; the gate is just always active unless you opt out per call |
| `resume_delay_sec` | background seconds before a resume app-open ad is eligible |

## Custom (non-ad) keys

```kotlin
val value = ads.getRemoteString("user_custom_value", "N/A")
val flag  = ads.getRemoteBoolean("show_onboarding", true)
val count = ads.getRemoteInt("max_free_features", 3)
val json  = ads.getRemoteJson("user_custom_json")       // org.json.JSONObject?
val list  = ads.getRemoteJsonArray("user_custom_list")  // org.json.JSONArray?
```

Register in-app defaults for custom keys the same way as ad config defaults,
via the builder:

```kotlin
val defaults = RemoteConfigDefaults.Companion.Builder()
    .setAdConfigurationAsset(context, "ads_remote_config_defaults.json")
    .addCustomDefault("user_custom_value", "default_value")
    .addCustomDefaultFromAsset(context, "user_custom_json", "user_custom_json.json")
    .build()
```

## Firebase console setup

1. Remote Config → **Add parameter** → key `ad_configuration` (or your own `configKey`), type **JSON**
2. Paste the same JSON template the XML SDK uses
3. In the release block, replace test IDs with your live unit IDs; leave the debug block on test IDs
4. Publish

## Testing checklist

- [ ] Fresh install, airplane mode → bundled/app-supplied default JSON drives ads, no crash
- [ ] Toggle a placement's `enable: false` → that placement stops after the next fetch
- [ ] `ads_enabled: false` → all ads suppressed
- [ ] Add `"points": ["settings"]` to a placement, call it with `point = "settings"` → blocked at that call site only
- [ ] Dark theme → `NativeAd()`/`NativeAdCard()` use the `dark` palette
- [ ] Release build reads the release block only

If something isn't behaving, see [Troubleshooting](/compose-sdk/troubleshooting).
