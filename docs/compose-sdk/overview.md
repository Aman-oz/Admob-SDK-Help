---
sidebar_position: 1
title: Overview
---

# Ozi AdMob SDK — Compose Edition

`com.ozi.admob.nextgen.compose:ads` (currently **`1.0.2`**) is the Jetpack
Compose counterpart to the [XML/View-based SDK](/xml-sdk/overview) — same
underlying idea (a facade over the GMA Next-Gen SDK
(`com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk`, currently
**`1.3.1`** — the same version the XML SDK currently uses), driven by one
Firebase Remote Config JSON parameter), rebuilt so Compose apps don't have to
reach through `AndroidView`/`ViewBinding` to use it. If your app is
Compose-first, this is the track to follow; if it's Activity/Fragment + XML
layouts, see the [XML SDK docs](/xml-sdk/overview) instead — the two are
separate, versioned independently, and published as different Maven
coordinates. Adding mediation? See
[Getting Started → Picking mediation adapter versions](/compose-sdk/getting-started#picking-mediation-adapter-versions)
first — adapter compatibility doesn't line up with this version number the
way you'd expect.

## What's the same as the XML SDK

- **`AdMobManager`** is still the single entry point (`AdMobManager.getInstance(application)`), owning one loader per format plus the shared `AdController` and lazy `AdsRemoteConfig`.
- **Placement resolution** works identically — an `AdPlacementKeys` constant resolves to an ad unit ID via Remote Config, with the same `enable` flag and per-point block-list mechanics.
- **The Remote Config JSON schema is the same shape** — `ad_configuration`-style parameter, `debug`/`release` environment blocks, `~28` placements, pacing values, `native_ad_design`. One console entry can drive both an XML app and a Compose app.
- **`AdMobManager.isPremium`** is still the global kill switch, and every loader still resolves its callback so callers can proceed even when an ad is skipped.

## What's different — deliberately

- **Banner and native are Composables**, not imperative loader calls — `BannerAd()` and `NativeAd()`/`NativeAdCard()` load on entering composition and `destroy()` on leaving, so you never manage their lifecycle by hand.
- **Loaders are coroutine-based**, not Handler/callback-threaded — `suspend` functions under the hood, `Deferred` for in-flight-load joining, and results always delivered back on `Dispatchers.Main`.
- **Interstitial and rewarded use one-shot loads, not the SDK's preload buffer** — a self-refilling preloader's callback fires on every refill, which would turn a "load once, show once" flow into a loop. (App Open still uses the preloader for the resume ad, same as the XML SDK, since that one's supposed to always stay topped up.)
- **No Navigation Configuration layer.** The XML SDK's config-driven splash → language → onboarding → main/premium flow has no equivalent here — this SDK covers ads and Remote Config only. If your Compose app needs that kind of flow, you're building your own navigation logic (e.g. with Navigation 3).
- **The loading dialog is Compose-hosted**, not an XML `Dialog` layout — see [Loading Dialog](/compose-sdk/loading-dialog) for how `showDialog`/`dialogTimeout`/`dialogModel` work here.

## Where things live

| Concern | Class/Composable | Package |
|---|---|---|
| Entry point / singleton | `AdMobManager` | `core` |
| Shared config object | `AdController` | `utils` |
| Interstitial | `InterstitialAdLoader` | `ads.interstitial` |
| Rewarded | `RewardedAdLoader` | `ads.rewarded` |
| App Open + Resume | `AppOpenAdLoader`, `ResumeAdManager`, `StartAdManager` | `ads.appopen` |
| Banner | `BannerAd()` Composable, `BannerAdLoader` | `ads.banner` |
| Native | `NativeAd()`, `NativeAdCard()` Composables, `NativeAdLoader` | `ads.nativead` |
| Loading dialog | `LoadingDialog`, `LoadingDialogModel` | `ui` |
| Remote Config | `AdsRemoteConfig`, placement model | `remote_config` |
| Consent (UMP) | `AdsConsentManager` | `consent` |

## Next steps

- New integration → [Getting Started](/compose-sdk/getting-started)
- Wiring up a specific format → [Ad Formats](/compose-sdk/ad-formats)
- Customizing the loading dialog → [Loading Dialog](/compose-sdk/loading-dialog)
- Ad IDs/pacing without a release → [Remote Config](/compose-sdk/remote-config)
