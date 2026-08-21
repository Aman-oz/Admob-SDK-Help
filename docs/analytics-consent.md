---
sidebar_position: 6
title: Analytics & Consent
---

# Analytics & Consent

## Analytics

`AnalyticsManager` wraps Firebase Analytics and is on by default — no
separate setup beyond having `google-services.json` in the app.

```kotlin
val analytics = AnalyticsManager.getInstance(applicationContext)
analytics.sendAnalytics("action detail", "action name")
```

`AdsAnalytics` (package `domain.analytics` on this line — moved from
`domain.apps_flyer` on the legacy line, and AppsFlyer itself is **not** a
dependency here) logs the standard ad lifecycle events automatically from
inside each loader:

| Event | Fires when |
|---|---|
| `ad_loaded` | An ad finishes loading successfully |
| `ad_shown` | An ad is displayed |
| `ad_clicked` | The user taps the ad |
| `ad_dismissed` | A fullscreen ad is closed |
| `ad_failed` | Load or show fails |
| `showing_ad` | Just before display, for funnels that need the "about to show" moment separate from "shown" |

Impression-level **revenue** arrives separately, via each format's
`onAdPaid(AdValue)` callback inside the SDK — not something you need to wire
up yourself, it's already logged alongside the events above.

Filter logs by tag to see analytics + everything else the SDK logs:

```bash
adb logcat | grep "Monetization"
```

## Consent (GDPR/CCPA via UMP)

Gather consent before initializing/loading ads, typically in your launcher
`Activity` or `Application`:

```kotlin
private var adsConsentManager: AdsConsentManager? = null

private fun initConsent() {
    adsConsentManager = AdsConsentManager(this)

    val canRequestAds = adsConsentManager?.canRequestAds
    if (canRequestAds == false) {
        adsConsentManager?.showGDPRConsent(this, BuildConfig.DEBUG) { consentError ->
            if (consentError != null) {
                Log.e("Consent", "Error during consent gathering: ${consentError.message}")
            }
            // proceed to initialize ads either way — the SDK's own defaults
            // still apply if consent gathering itself fails
        }
    } else {
        // already have consent — proceed to initialize ads
    }
}
```

There's also a preload variant used on the splash screen in the
[Navigation Configuration](/navigation-configuration) flow
(`consentManager.preLoadConsent(activity, isTest)` /
`showPreLoadGDPRConsent(activity, isTest) { success -> }`), which warms the
consent form so it can be shown without an extra network round-trip delay.

```kotlin
consentManager.preLoadConsent(activity, isTest = BuildConfig.DEBUG)

if (!consentManager.canRequestAds) {
    consentManager.showPreLoadGDPRConsent(activity, BuildConfig.DEBUG) { success ->
        if (success) initializeAds()
    }
} else {
    initializeAds()
}
```

## Order of operations

1. Gather consent (`AdsConsentManager`)
2. Initialize the ad SDK (`AdMobManager.initWithRemoteConfig` / `initialize`)
3. Load ads

Skipping straight to step 2/3 before consent is resolved is the most common
compliance mistake — always gate ad initialization on `canRequestAds`.
