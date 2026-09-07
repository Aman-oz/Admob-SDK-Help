---
sidebar_position: 4
title: Remote Config
---

# Remote Config

The SDK is driven by **one Firebase Remote Config JSON parameter**:
`ad_configuration`. It carries separate `debug_ad_configuration` and
`release_ad_configuration` blocks — the block used is picked by the `isDebug`
flag you pass at init (your app's `BuildConfig.DEBUG`), so **apps never swap
IDs manually**. Each block holds:

- **~28 placement objects** — `{ "enable": boolean, "adId": string, "points": [string] }` (keys defined in `AdPlacementKeys`; `points` is optional — see [Per-point control](#per-point-control))
- **Pacing** — `ads_enabled`, `native_ad_refresh_time`, `interstitial_count`, `interstitial_delay_min_sec`, `interstitial_delay_max_sec`, `resume_delay_sec`
- **`native_ad_design`** — light/dark color palettes, with per-placement overrides

The maintained JSON template lives at the SDK repo root,
`remote_config_ad_configuration.json`. The same schema (with Google test IDs)
ships bundled inside the library at `assets/ads_remote_config_defaults.json`,
so ads work **offline, before the first fetch, and even without Firebase
configured at all**.

## Shipping your own default JSON

By default, the pre-fetch/offline configuration is the bundled test-ID JSON.
To make your app's real ad unit IDs and pacing active from the very first
launch — before Firebase responds — supply your own:

```kotlin
AdMobManager.getInstance(this).initWithRemoteConfig(
    appId = "ca-app-pub-XXXXXXXX~YYYYYYYY",
    isDebug = BuildConfig.DEBUG,
    defaults = RemoteConfigDefaults.Companion.Builder()
        .setAdConfigurationAsset(this, "default_ad_configuration.json") // app/src/main/assets/
        // or inline: .setAdConfigurationJson(defaultAdConfigJson)
        .build()
) { success -> }
```

If the app-supplied JSON fails to parse, the SDK logs a warning and falls back
to the bundled asset — it never crashes on a bad default.

**Fetch timeout** (default 6s, `fetchTimeoutMillis`): if the fetch hasn't
completed in time, the callback fires with `false` so the app proceeds on
defaults — but the request keeps running in the background. When it does
arrive, it's activated and applied automatically, so later reads (`adIdFor`,
`isEnabled`, …) return the fresh values. The callback fires exactly once.

## Loading ads by placement key (recommended)

Every loader has `...ForPlacement` variants that take an `AdPlacementKeys`
constant instead of a raw ad unit ID. The SDK checks `ads_enabled` (global)
AND the placement's own `enable` flag AND that the resolved ID is well-formed,
then resolves the ad unit ID internally:

```kotlin
val mgr = AdMobManager.getInstance(application)

mgr.bannerAdLoader.showAdaptiveBannerForPlacement(
    this, shimmer, frame, AdPlacementKeys.HOME_BANNER, 5000
) { }

mgr.interstitialAdLoader.showAdForPlacement(
    this, AdPlacementKeys.INTERNAL_APP_INTERSTITIAL
) { proceed -> if (proceed) goToNextScreen() }

mgr.nativeAdLoader.loadAndShowForPlacement(AdPlacementKeys.HOME_NATIVE, builder) { }
```

### Disabled-placement callback semantics

This is the part that's easy to get backwards — memorize the asymmetry:

| Ad type | Methods | Callback when disabled |
|---|---|---|
| Native / Banner | all `...ForPlacement` | `false` **and** container collapsed (`GONE`, shimmer hidden) |
| Interstitial | `loadAdForPlacement`, `loadAdWithTimeOutForPlacement` | `false` |
| Interstitial | `showAdForPlacement`, `showAndLoadAdForPlacement`, `showAdWithTimeAndCounterForPlacement`, `loadAndShowAdForPlacement` | **`true`** — navigation proceeds |
| Rewarded | `loadAdForPlacement` | `false` |
| Rewarded | `loadAndShowAdForPlacement` | **`true`** |
| App Open (start / resume) | `loadAppOpenAd`, `loadResumeAd`, `showAppOpenAdIfAvailable`, `showResumeAdIfAvailable` | `false` |

App open ads have no placement-key parameter — `appOpenAdLoader` always uses
the fixed `app_open` (start) and `app_open_resume` placements, checked
automatically on every load/show, including the automatic resume-ad lifecycle.

### Manual resolution

The raw-ID methods still work if you want to resolve a placement yourself:

```kotlin
if (mgr.isEnabled(AdPlacementKeys.HOME_BANNER)) {
    mgr.bannerAdLoader.showAdaptiveBanner(
        this, shimmer, frame, mgr.adIdFor(AdPlacementKeys.HOME_BANNER), 5000
    ) { }
}
```

- `mgr.adIdFor(key)` — the placement's ad unit ID
- `mgr.isEnabled(key)` — `ads_enabled` AND placement `enable` AND well-formed ID
- `mgr.isEnabled(key, point)` — same, plus blocked if `point` is in that placement's `points` list
- `mgr.nativeColorsFor(key, isDark)` — native ad palette for a placement + theme

## Per-point control

A single placement (one ad unit ID) is often reused across several screens. To
block it at *some* call sites without touching the others, pass an optional
`point` — a free-form call-site token you choose — next to `placementKey`:

```kotlin
// Reused everywhere, but Remote Config lists "settings" in
// internal_app_interstitial.points, so just this call site is blocked.
mgr.interstitialAdLoader.loadAndShowAdForPlacement(
    this, AdPlacementKeys.INTERNAL_APP_INTERSTITIAL, point = "settings"
) { proceed -> if (proceed) goToNextScreen() }
```

```json title="ad_configuration → internal_app_interstitial"
{
  "enable": true,
  "adId": "ca-app-pub-xxx/111",
  "points": ["settings", "editor"]
}
```

Rules:

- **Listed → blocked. Not listed / no `points` array / no `point` passed → shows.** A screen you forgot to add still shows ads — the safe default.
- Tokens are normalized (`trim().lowercase()`) on both sides, so `"Settings "` matches `"settings"`.
- `adIdFor(key)` is unaffected — every point still shares the one ad unit.
- Blocked callback semantics match the disabled-placement table above.
- `mgr.observedPoints()` returns every `"placement:point"` combo seen at runtime — useful for a debug screen that lists candidate points to block.

## Native ad design (light/dark)

With the placement-key native methods, the color palette is applied
**automatically** — any color you didn't set explicitly on `NativeAdBuilder`
is filled from `native_ad_design` for that placement, matching the current
theme. Explicit setters always win over the remote palette.

```kotlin
val builder = NativeAdBuilder.Builder(R.layout.native_splash, frame, shimmer)
    .setShowMedia(true) // visibility toggles only — no colors needed
    .build()
mgr.nativeAdLoader.loadAndShowForPlacement(AdPlacementKeys.SPLASH_NATIVE, builder) { }
```

`native_ad_design.default` supplies the palette for every native placement;
`native_ad_design.overrides.<placement>` replaces it for that placement only.

## Pacing values

Applied automatically on every (re-)apply:

| JSON key | Effect |
|---|---|
| `ads_enabled` | `false` → all ads suppressed (the premium path); callbacks still fire `true` so UI proceeds |
| `interstitial_count` | show an interstitial every N actions (`showAdWithTimeAndCounter`) |
| `interstitial_delay_min_sec` | minimum seconds between interstitials |
| `interstitial_delay_max_sec` | force-show after this many seconds |
| `resume_delay_sec` | background seconds before a resume app-open ad |

`app_open_resume.enable` gates the resume ad through the placement check on
every load/show — it does **not** touch `setShouldShowResumeAd`, which is a
separate, app-controlled override that Remote Config never overwrites.

## Custom (non-ad) keys

Project-specific parameters work through generic accessors:

```kotlin
val value    = mgr.getRemoteString("user_custom_value", "N/A")
val flag     = mgr.getRemoteBoolean("show_onboarding", true)
val count    = mgr.getRemoteInt("max_free_features", 3)
val json     = mgr.getRemoteJson("user_custom_json")      // org.json.JSONObject?
val list     = mgr.getRemoteJsonArray("user_custom_list") // org.json.JSONArray?
```

Fallback order is always: fetched Firebase value → in-app custom default (via
`RemoteConfigDefaults.Builder().addCustomDefault(...)`) → the default passed at
the call site.

## Reading every value (debugging)

Two different tools, depending on what you actually need — don't reach for
the wrong one:

### Every key Firebase has, regardless of schema

`AdsRemoteConfig.getAllValues()` wraps Firebase's own `FirebaseRemoteConfig.all`
and returns **every parameter currently fetched**, as `String`, whether or not
the SDK has a typed accessor for it — including keys you haven't written any
code against yet:

```kotlin
val all: Map<String, String> = AdMobManager.getInstance(application).remoteConfig.getAllValues()
all.forEach { (key, value) -> Log.d("RemoteConfig", "$key = $value") }
```

Falls back to the in-app defaults map if Firebase isn't available, so it never
throws. This is the right call for a generic "list everything currently in the
console" debug screen — but it gives you flat strings, not the parsed
placement/pacing/design structure.

### The sample app's schema-aware dump (what `AdsApplication` actually logs)

For day-to-day debugging, the sample app does **not** call `getAllValues()` —
it logs the fully-parsed `ad_configuration` object plus a handful of named
custom keys, grouped by meaning instead of a flat key list. Called once from
the `initWithRemoteConfig` completion callback:

```kotlin
private fun logRemoteConfigTestResults(fetchSuccess: Boolean) {
    val mgr = AdMobManager.getInstance(this)
    val config = mgr.remoteConfig.getRemoteAdConfig()

    logEnvironmentBlock("debug_ad_configuration", config.debug)
    logEnvironmentBlock("release_ad_configuration", config.release)
    logResolvedNativeDesigns(mgr)   // logs adIdFor(...) for every native placement
    logCustomValues(mgr)            // logs named custom keys via getRemoteString/getRemoteJson
}
```

`logCustomValues` is intentionally explicit about which custom keys it prints
— it isn't a generic enumeration, it's whichever keys you've added a log line
for (`user_custom_value`, `user_custom_json`, …). Copy this pattern (it's
self-contained) into your own app and add a line per custom key you own.

### Other built-in debug helpers on `AdsRemoteConfig`

```kotlin
rc.logAdConfiguration(BuildConfig.DEBUG)                 // full structured dump, as above
rc.logRemoteConfigStatus()                               // one-line fetch status
rc.testRemoteConfigKeys(listOf("user_custom_value"))      // Map<key, Pair<value, source>> for keys you name
```

## Firebase console setup

1. Remote Config → **Add parameter** → key `ad_configuration`, type **JSON**
2. Paste the maintained JSON (`remote_config_ad_configuration.json`)
3. In `release_ad_configuration`, replace every test ID
   (`ca-app-pub-3940256099942544/...`) with your **live** unit IDs; leave
   `debug_ad_configuration` on test IDs
4. Publish — debug builds fetch instantly (0s interval), release builds cache
   for 12h

## Testing checklist

- [ ] Fresh install, airplane mode → bundled default JSON drives ads, no crash
- [ ] Toggle a placement's `enable: false` → that placement stops after the next fetch; others unaffected
- [ ] `ads_enabled: false` in the debug block → all ads suppressed, UI still proceeds
- [ ] Add `"points": ["settings"]` to a placement, call it with `point = "settings"` from that screen → blocked; the same placement from another screen (different/no `point`) still shows
- [ ] Dark theme → native ads use the `dark` palette
- [ ] Malformed JSON in console → parser falls back to the bundled default, app keeps running
- [ ] Release build reads `release_ad_configuration` only

If something isn't behaving, see [Troubleshooting](/troubleshooting#remote-config-values-look-stale).
