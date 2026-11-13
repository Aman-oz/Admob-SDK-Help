---
sidebar_position: 3
title: Startup Flow
---

# Startup Flow

One call runs the common app-start sequence — **Remote Config → update check →
consent form** — and then hands control back to your app, which carries on with
its own flow: initialize ads, load the app-open ad, navigate.

It replaces the code every app used to write by hand: a "Remote Config is ready"
flag with a waiter list, a separate consent call, and a separate update check.

```
t = 0   (the splash calls startup.start)
 ├─ Remote Config   wait for the fetch ..................... cap 6 s
 ├─ Update query    ask Play for a newer version ........... cap 5 s     all three
 └─ Consent info    ask Google if a form is needed ......... cap 5 s     in parallel
        │
        ▼   the UI is one-at-a-time, and only when needed
 1. Update dialog   flexible: No thanks / Update  ·  immediate: Play's own screen
 2. 250 ms pause
 3. Consent form    only if Google says one is required     (form load cap 8 s)
        │
        ▼
 Callback → StartupResult → your app initializes ads and carries on
```

:::info[Added in 2.1.0]
The startup flow is opt-in. An app that doesn't call `startup.start(...)`
behaves exactly as before.
:::

## Integration

### 1. Application — start Remote Config, defer ads

```kotlin title="MyApplication.kt"
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AdMobManager.getInstance(this)
            .setPremium(false)
            .setDeferAdsInit(true)          // ads are initialized later, after consent
            .initWithRemoteConfig(
                appId = "ca-app-pub-XXXXXXXX~YYYYYYYY",
                isDebug = BuildConfig.DEBUG,
                defaults = RemoteConfigDefaults.Companion.Builder()
                    .setAdConfigurationAsset(this, "default_ad_configuration.json")
                    .setNavigationConfigurationAsset(this, "default_navigation_configuration.json")
                    .build()
            )
    }
}
```

Start the fetch here, as early as possible, so most of it is already done by
the time the splash screen opens. Pass `configKey = "..."` only if your Firebase
parameter isn't named `ad_configuration`. `setDeferAdsInit(true)` is explained
[below](#what-setdeferadsinit-does).

### 2. Splash — run the flow, then continue

```kotlin title="SplashActivity.kt"
private val ads by lazy { AdMobManager.getInstance(application) }

override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContentView(binding.root)
    showLoader() // your own splash loader stays up while the SDK works

    ads.startup.start(this) { result ->
        if (isFinishing || isDestroyed) return@start
        Log.d(TAG, "startup: update=${result.updateOutcome} consent=${result.consentOutcome} " +
                "canRequestAds=${result.canRequestAds} in ${result.elapsedMs}ms")

        // Granted, declined, timed out or failed — the ads flow carries on either way.
        ads.initializeAds(
            onInitializationComplete = { continueSplash() },   // load the app-open ad, then navigate
            onInitializationFailed = { continueSplash() }      // go on without ads
        )
    }
}
```

`start` needs a `ComponentActivity` (an `AppCompatActivity` is one) because the
update dialog and the consent form are shown from it. After `initializeAds`
completes, your app does whatever is next — typically
[`nav.onSplashContinue(host)`](/xml-sdk/navigation-configuration).

:::warning[Call initWithRemoteConfig first]
`startup.start(...)` waits on the fetch that `initWithRemoteConfig` started. If
`start` runs before `initWithRemoteConfig` was ever called, there is nothing to
wait for: the Remote Config step ends immediately as "not fetched" and the app
runs on defaults.
:::

## What happens, in order

The three network lookups start **together** at the moment you call `start`, so
by the time a dialog is needed its answer is usually already there. Only the UI
is sequential.

| Step | What it waits for | Cap | If the cap passes |
|---|---|---|---|
| **Remote Config** | The Firebase fetch started by `initWithRemoteConfig` | 6 s | Continues on cached or default values; the fetch keeps running and applies when it lands |
| **Update query** | Play answering "is there a newer version?" | 5 s | Treated as no update (`FAILED`) |
| **Consent info** | Google answering "does this user need a consent form?" | 5 s | Uses the consent state saved last time |
| **Consent form load** | The form downloading, only when one is required | 8 s | Continues without it; the form never appears late |

The caps are **ceilings on waiting for the network, not delays**: a step that
finishes sooner continues immediately, and cached Remote Config is usually
instant. The three lookups run in parallel, so together they wait at most about
6 s — the **largest** of their caps, not the sum. If a consent form is required, add up
to 8 s for it to load, which starts after the lookups. A dialog or form that is
already on screen is the user's time and is never timed.

After the lookups:

1. **Update dialog.** Only if `app_update_type` is `0` or `1` *and* Play has an
   update. Flexible shows *No thanks* / *Update*; immediate opens Play's own
   full-screen screen. The flow waits for the user's decision, not for the
   download. See [In-App Updates](/xml-sdk/app-update).
2. A 250 ms pause, only after the update step ended in `DECLINED` or `ACCEPTED`, so the
   consent form doesn't pop in over a dialog or Play's screen closing.
3. **Consent form.** Only if Google says one is required **and**
   `app_navigation_configuration.splash.show_consent` is `true` (the default). When
   `show_consent` is `false` the form is skipped, but Google's consent-info request
   still runs at the start.

Then the callback runs.

## StartupOptions

`StartupOptions()` — the defaults below — is what most apps pass.

```kotlin
ads.startup.start(this, StartupOptions(
    remoteConfigTimeoutMs = 4_000L,   // shorter splash budget
    checkUpdate = false               // e.g. a build that never offers in-app updates
)) { result -> /* ... */ }
```

| Option | Default | Meaning |
|---|---|---|
| `checkUpdate` | `true` | Run the update step. It is still skipped when `app_update_type` isn't `0`/`1` |
| `askConsent` | `true` | Run the consent step. It is still skipped when `show_consent` is `false` |
| `remoteConfigTimeoutMs` | `6000` | Longest wait for the Remote Config fetch |
| `updateQueryTimeoutMs` | `5000` | Longest wait for Play's answer |
| `consentInfoTimeoutMs` | `5000` | Longest wait for Google's "is a form needed?" answer |
| `consentFormLoadTimeoutMs` | `8000` | Longest wait for the form to load. After it, the form is skipped for good |
| `consentTestMode` | `false` | Forces the test setup: EEA geography, consent reset on every launch. **Never ship `true`** — every user would see the form every launch |
| `updateUiModel` | `AppUpdateUiModel()` | Text and tint overrides for the update dialog |
| `force` | `false` | Run again even though the flow already completed in this process |

The Remote Config, update-query and consent-info timeouts are measured from the moment
`start` is called. The form-load timeout starts when the form begins loading, after those steps.

## StartupResult

| Field | Values | Meaning |
|---|---|---|
| `remoteConfigFetched` | `true` / `false` | `true` = fresh values arrived in time. `false` = timed out or failed; cached or default values are in effect |
| `updateOutcome` | `DISABLED` | `app_update_type` isn't `0`/`1`, or the step was turned off |
| | `NO_UPDATE` | Play has nothing newer for this build |
| | `DECLINED` | An update was offered and the user said no (*No thanks*, or cancelled Play's sheet). Flexible only |
| | `ACCEPTED` | The user accepted. Flexible: the download has started. Immediate: Play updated the app |
| | `FAILED` | Play didn't answer in time, the query failed, or the flow couldn't start |
| `consentOutcome` | `SKIPPED` | Turned off in `StartupOptions`, or `show_consent` is `false` |
| | `READY` | Google was updated, and the form was shown if it was required. The user may have accepted or declined |
| | `TIMED_OUT` | Google or the form didn't answer in time; the last saved consent state applies |
| | `FAILED` | The request or the form failed; the last saved consent state applies |
| `consentStatus` | `UNKNOWN` · `NOT_REQUIRED` · `REQUIRED` · `OBTAINED` | Where the user stands, as Google reports it (see below) |
| `canRequestAds` | `true` / `false` | Google's `canRequestAds` at the end of the flow. Informational |
| `elapsedMs` | milliseconds | From `start` to the callback, dialogs and forms included |

## Consent never stops the ads flow

Whether the user accepts, declines, the form times out or it fails, the callback
**still arrives** and your app carries on. The SDK handles the consent step end
to end:

1. It asks Google whether a form is needed (5 s cap).
2. It loads the form (8 s cap). If it can't load in time, the flow moves on and
   the form is never shown late on top of whatever your app moved on to.
3. It shows the form — the user's time, so not timed.
4. It reports what happened.

The ad SDK applies whatever choice Google has stored: personalized ads when the
user allowed them, generic ones otherwise. Note that Google's consent SDK does
**not** say whether the user accepted or declined — `OBTAINED` only means they
completed the form.

:::note[If a project needs stricter handling]
`consentOutcome`, `consentStatus` and `canRequestAds` are informational; the SDK
never gates ads on them. Google's guidance is to request ads only when
`canRequestAds` is `true`, so if a project needs that behavior (for example
after a policy review for EEA/UK users), check `result.canRequestAds` in the
callback before calling `initializeAds()`.
:::

## What setDeferAdsInit does

`setDeferAdsInit` decides **when the ads SDK itself is initialized**
(`MobileAds.initialize`).

| | `false` (default) | `true` |
|---|---|---|
| `initWithRemoteConfig` | Starts Remote Config **and** initializes ads right away | Starts Remote Config **only** |
| Ads SDK initialized | In `Application.onCreate` | When you call `initializeAds()` |
| Use when | You don't use the startup flow, or want ads ready before any flow | You use the startup flow and want consent settled before ads initialize |

**Why defer.** Initializing the ads SDK also initializes every mediation adapter
— AppLovin, Meta, Unity, Pangle and the rest — and they start their own work,
possibly reading identifiers, at that moment. For users who must be asked for
consent, that should happen *after* the consent step, not before it.

**Rules**

- Set it `true` only if something will call `initializeAds()` — normally the
  startup callback, **in every case**. Forget it and ads are never initialized.
- Call it **before** `initWithRemoteConfig`.
- Leave it `false` if you don't use the startup flow.
- While deferred, the automatic resume-ad handlers stay idle, so nothing touches
  an uninitialized ads SDK.
- `initializeAds()` reuses the app ID you gave `initWithRemoteConfig`. If that was
  never called, it throws `IllegalStateException`; call `initialize(appId)` with
  an explicit ID instead.

## Guarantees

- The callback runs **exactly once**, on the main thread.
- The flow runs **once per process**. A second `start` returns the earlier
  result immediately; pass `StartupOptions(force = true)` to run it again.
  `ads.startup.lastResult` and `ads.startup.isRunning` let you check from anywhere.
- If the screen is destroyed mid-flow (a rotation, for example), the flow carries
  on. The next `start` from the new screen re-attaches, redoes any dialog step that
  was interrupted, and receives the result.
- The flow loads the navigation config itself once Remote Config resolves, so apps
  no longer call `NavigationFlowManager.loadFromRemoteConfig()` for this.

## Without the startup flow

The pieces still work on their own if a project needs something different:

- Remote Config: call `nav.loadFromRemoteConfig()` in the `initWithRemoteConfig` callback.
- Update: `appUpdate.checkForUpdate(activity)` — see [In-App Updates](/xml-sdk/app-update).
- Consent: `AdsConsentManager` — see [Analytics & Consent](/xml-sdk/analytics-consent).

## Testing

```bash
adb logcat | grep -E "StartupFlow|AppUpdateController|AdsConsentManager"
```

The flow's own lines carry the `Monetization :- startup:` prefix, and the last one
prints the whole `StartupResult`. To see the consent form on a device outside the EEA, set
`consentTestMode = true` for a local build and turn it back off afterwards. To test
the update dialog, see [In-App Updates → Testing](/xml-sdk/app-update#testing-a-real-update).
Airplane mode is a good test too: the splash should continue after the caps, with
`FAILED` or `TIMED_OUT` outcomes, and never hang.

## Common mistakes

- **`setDeferAdsInit(true)` without `initializeAds()`** — ads never initialize.
- **`consentTestMode = true` in a release build** — the form shows on every launch.
- **Calling `start` from a screen that isn't a `ComponentActivity`** — it won't compile.
- **Blocking `Application.onCreate`** — don't; `initWithRemoteConfig` returns immediately.
- **Reading the navigation config before the callback** — it still holds the in-code defaults, not your default JSON file.
