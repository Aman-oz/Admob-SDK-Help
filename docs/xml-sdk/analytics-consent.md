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

:::tip[Using the startup flow? You're done]
The [Startup Flow](/xml-sdk/startup-flow) runs the whole consent step for you — asks
Google whether a form is needed, loads it under a timeout, shows it, and reports the
outcome — and then your app carries on. Read on only if you drive consent yourself.
:::

`AdsConsentManager` wraps Google's User Messaging Platform (UMP):

```kotlin
val consent = AdsConsentManager(context)
```

| Member | What it does |
|---|---|
| `requestConsentInfo(activity, isTest) { updated -> }` | Asks Google whether this user needs a consent form (region, previous choice). Non-interactive: it shows nothing. `true` = the info was updated, `false` = the request failed. Run it **before** `showFormIfRequired`. `preLoadConsent(activity, isTest)` is the same without a callback |
| `showFormIfRequired(activity, loadTimeoutMs) { outcome -> }` | Shows the form only if one is required. Loading is capped at `loadTimeoutMs`, and a form that missed the cap is **never shown late**. Once the form is on screen it isn't timed. Calls back once with a `FormOutcome` |
| `status` | `ConsentStatus`: `UNKNOWN`, `NOT_REQUIRED`, `REQUIRED` or `OBTAINED` |
| `canRequestAds` | Google's own answer. It can be `false` until the consent info has been requested |
| `reset()` | Clears the saved consent state, for testing |

`FormOutcome` values: `NOT_REQUIRED` (no form was needed), `COMPLETED` (the user
finished the form, accepting or declining), `TIMED_OUT` (the form couldn't load in time,
so nothing was shown) and `FAILED`.

Google's consent SDK does **not** tell you whether the user accepted or declined
personalization. `OBTAINED` only means they completed the form; the ad SDK applies the
stored choice by itself — personalized ads when allowed, generic ones otherwise.

```kotlin
val consent = AdsConsentManager(this)

consent.requestConsentInfo(this, isTest = false) { _ ->
    consent.showFormIfRequired(this, loadTimeoutMs = 8_000L) { outcome ->
        Log.d(TAG, "consent: $outcome status=${consent.status} canRequestAds=${consent.canRequestAds}")
        // Carry on and initialize ads whatever the outcome.
    }
}
```

:::warning[isTest is a test switch]
`isTest = true` resets the saved consent and forces an EEA test geography on this
device, so the form appears on every launch. Pass it deliberately for local testing
only. Never write `isTest = BuildConfig.DEBUG` into code that others will run: every
debug build would reset consent each time.
:::

### Older methods

- `showPreLoadGDPRConsent(activity, isTest) { shown -> }` still works. It loads and shows
  the form if required, with **no timeout**. Its `isTest` parameter has no effect — to
  use the test setup, call `preLoadConsent` / `requestConsentInfo` with `isTest = true`.
- `showGDPRConsent(activity, isTest) { formError -> }` is **deprecated**. Use
  `requestConsentInfo` followed by `showFormIfRequired`.

## Order of operations

1. Consent — ask Google, then show the form if required (`AdsConsentManager`, or the startup flow)
2. Initialize the ad SDK (`AdMobManager.initializeAds()`, or `initWithRemoteConfig` without `setDeferAdsInit`)
3. Load ads

Initialize ads **after** the consent step, not before: initializing also starts every
mediation adapter. That is what `setDeferAdsInit(true)` is for — see
[Startup Flow](/xml-sdk/startup-flow#what-setdeferadsinit-does).

**Consent does not stop the ads flow.** Granted, declined, timed out or failed, the SDK
carries on and the ad SDK applies whatever choice Google has stored. Google's guidance
is to request ads only when `canRequestAds` is `true`; this SDK deliberately doesn't
gate on it. If a project needs that behavior (for example after a policy review for
EEA/UK users), check `consent.canRequestAds` yourself before step 2.
