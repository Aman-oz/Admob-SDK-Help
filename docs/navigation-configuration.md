---
sidebar_position: 5
title: Navigation Configuration
---

# Navigation Configuration

A small, config-driven navigation layer for the **splash → language →
onboarding → main / premium** journey. It works the same whether your screens
are Activities or Fragments.

- The SDK decides **what happens next**; your app performs the actual
  navigation and ad display via a `NavigationHost` implementation.
- Flow logic is driven by one Remote Config key, **`navigation_configuration`**,
  carrying **flow numbers only — no ad unit IDs**. Ads are shown through your
  existing `AdMobManager` (IDs come from `ad_configuration` — see
  [Remote Config](/remote-config)).
- It reuses the **same Firebase fetch** as the ad config — nothing extra to fetch.

## Integration at a glance

| Where | What you call |
|---|---|
| `Application.onCreate` | 1. `nav.setConfig(defaults)` → 2. `initWithRemoteConfig(...)` → 3. in its callback: `nav.loadFromRemoteConfig()` |
| Splash screen | Wait for the fetch → read `nav.config.splash.getStartedVariant` to build the UI → `nav.onSplashContinue(host)` |
| Language screen | `nav.onLanguageSelected(host, fromSplash)` on Done |
| Onboarding screen | `nav.onOnboardingComplete(host)` when finished |
| Premium screen | `nav.onPremiumClose(host, fromSplash)` on close/back |

The SDK never navigates or shows ads itself — every step goes through your
`NavigationHost` implementation.

## 1. Application class

Three things, **in this order** — defaults must be set *before* the fetch so
remote values override them, never the reverse:

```kotlin
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        // (1) Navigation defaults — used offline / before the first fetch.
        NavigationFlowManager.getInstance(this).setConfig(
            NavigationConfig(
                splash = SplashConfig(
                    showConsent = false,      // show UMP consent form on splash
                    getStartedVariant = 0,    // 0=direct, 1=button+banner, 2=button+native, 3=button only
                    firstLaunchFlow = 0,      // 0=lang/onboarding, 1=interstitial first, else=main
                    secondLaunchFlow = 0
                ),
                onboarding = OnboardingConfig(completionFlow = 0),
                premium = PremiumConfig(closeFlow = 0)
            )
        )

        // (2) Init the ad SDK + kick off the shared Remote Config fetch.
        AdMobManager.getInstance(this)
            .setPremium(false)
            .initWithRemoteConfig(
                appId = "ca-app-pub-XXXXXXXX~YYYYYYYY",
                isDebug = BuildConfig.DEBUG
            ) { success ->
                // (3) Same fetch also carries `navigation_configuration` —
                // pull it in once the fetch completes (falls back to (1) if
                // the key is absent/invalid).
                NavigationFlowManager.getInstance(this).apply {
                    loadFromRemoteConfig()
                    logConfig() // optional: verify source + every value
                }
            }
    }
}
```

:::warning[The fetch is asynchronous]
If your splash reads the config immediately it would still see the defaults —
the splash must wait for the callback above (a `@Volatile` result + waiter
list is a common pattern for that readiness gate).
:::

## 2. Splash screen

Wait for the fetch, build the UI from `getStartedVariant`, and hand the click
to the SDK:

```kotlin
class SplashActivity : AppCompatActivity() {
    private val nav by lazy { NavigationFlowManager.getInstance(this) }
    private val ads by lazy { AdMobManager.getInstance(application) }
    private val host by lazy { AppNavigationHost(this, AdPlacementKeys.SPLASH_INTERSTITIAL) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(binding.root)

        awaitRemoteConfig { fetched ->
            if (isFinishing || isDestroyed) return@awaitRemoteConfig

            if (!nav.isFirstLaunch()) ads.appOpenAdLoader.loadAppOpenAd(this) {}

            if (nav.config.splash.showConsent) {
                consent.showPreLoadGDPRConsent(this) { setupSplash() }
            } else setupSplash()
        }
    }

    private fun setupSplash() {
        when (nav.config.splash.getStartedVariant) {
            0 -> nav.onSplashContinue(host)   // direct — no button
            1 -> { showGetStartedButton(); loadBanner() }
            2 -> { showGetStartedButton(); loadNative() }
            else -> showGetStartedButton()    // button only
        }
        btnGetStarted.setOnClickListener { nav.onSplashContinue(host) }
    }
}
```

`onSplashContinue` routes to the **first-launch** flow (language → onboarding)
or the **second-launch** flow (main / premium / ads) based on persisted state
— the splash never branches on that itself.

## 3. Implement `NavigationHost`

Does the actual navigation (Activity `startActivity` or Fragment transaction)
and shows ads via `AdMobManager`. **Every ad callback must run its
continuation** — even when skipped/premium — or the flow stalls. Create a
fresh host per screen and pass the interstitial placement that matches it.

```kotlin
class AppNavigationHost(
    private val activity: AppCompatActivity,
    private val interstitialPlacement: String = AdPlacementKeys.INTERNAL_APP_INTERSTITIAL
) : NavigationHost {
    private val ads = AdMobManager.getInstance(activity.application)

    override fun openLanguage() {
        activity.startActivity(Intent(activity, LanguageActivity::class.java)
            .putExtra(LanguageActivity.EXTRA_FROM_SPLASH, true))
        activity.finish()
    }

    override fun openOnboarding() { /* start OnboardingActivity, finish() */ }
    override fun openMain()       { /* start MainActivity (CLEAR_TASK), finish() */ }

    override fun openPremium(fromSplash: Boolean) {
        activity.startActivity(Intent(activity, PremiumActivity::class.java)
            .putExtra(PremiumActivity.EXTRA_FROM_SPLASH, fromSplash))
        activity.finish()
    }

    override fun close() { activity.finish() }

    override fun showInterstitial(point: String?, onComplete: () -> Unit) {
        // Resolved from the *ad* config by placement — never from the nav JSON.
        // `point` lets Remote Config block this specific navigation step
        // without touching the same placement used elsewhere in the app.
        ads.interstitialAdLoader.loadAndShowAdForPlacement(
            activity,
            placementKey = interstitialPlacement,
            showDialog = true,
            dialogTimeout = 2000,
            dialogModel = loadingDialog(),
            timeoutMillis = 8000,
            point = point,
            onAdLoadedListener = null,
            onSuccessListener = { onComplete() } // continuation always runs
        )
    }

    override fun showAppOpenAd(onComplete: (shown: Boolean) -> Unit) {
        if (ads.appOpenAdLoader.isStartAdAvailable()) {
            ads.appOpenAdLoader.showAppOpenAdIfAvailable { shown -> onComplete(shown ?: false) }
        } else {
            // Not preloaded yet — try to load once, then show (or fall back).
            ads.appOpenAdLoader.loadAppOpenAd(activity) { loaded ->
                if (loaded == true) ads.appOpenAdLoader.showAppOpenAdIfAvailable { shown -> onComplete(shown ?: false) }
                else onComplete(false)
            }
        }
    }
}
```

`NavigationHost.showInterstitial` takes a `point: String?` — each screen that
implements the flow can pass its own token (or `null`) so a single shared
interstitial placement stays independently blockable per navigation step, the
same mechanism described in
[Remote Config → Per-point control](/remote-config#per-point-control).

## 4. Language / Onboarding / Premium screens

```kotlin
// LANGUAGE — reachable two ways:
//  • splash journey (openLanguage sets EXTRA_FROM_SPLASH=true):
//      Done → persists selection → onboarding.  Back → blocked.
//  • from inside the app (plain intent, e.g. settings):
//      Done → persists selection → finishes back to source.  Back → goes back.
btnDone.setOnClickListener { nav.onLanguageSelected(host, fromSplash) }
```

```kotlin
// ONBOARDING — when finished:
nav.onOnboardingComplete(host) // persists onboardingDone, runs completion_flow
```

```kotlin
// PREMIUM — close button and back button both run the close flow:
btnClose.setOnClickListener { nav.onPremiumClose(host, fromSplash) }
onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() { nav.onPremiumClose(host, fromSplash) }
})
```

## Flow reference (from `navigation_configuration`)

### Splash — `get_started_variant`

| Value | UI |
|---|---|
| `0` | Direct flow, **no** button — navigation runs immediately |
| `1` | "Get Started" button + **Banner** ad |
| `2` | "Get Started" button + **Native** ad |
| `3` | "Get Started" button only |

### First vs. returning user

A user is on the **first-launch** journey until *both* are true:
`languageSelected` and `onboardingDone`.

```
isFirstLaunch = !(languageSelected && onboardingDone)
```

### First launch — `first_launch_flow`

| Value | Behavior |
|---|---|
| `0` | Language not selected → **Language**, else → **Onboarding** |
| `1` | **Interstitial**, then language/onboarding as above |
| else | **Main** |

### Second launch — `second_launch_flow`

| Value | Behavior |
|---|---|
| `0` | **Main** |
| `1` | **Interstitial** → Main |
| `2` | **Open ad** → success: Main / failure: **Interstitial** → Main |
| `3` | **Open ad** → Main (either way) |
| `4` | **Premium** |
| `5` | **Interstitial** → Premium |
| else | **Main** |

### Onboarding complete — `completion_flow`

| Value | Behavior |
|---|---|
| `0` | **Main** |
| `1` | **Interstitial** → Main |
| `2` | **Premium** |
| `3` | **Interstitial** → Premium |
| else | **Main** |

### Premium close — `close_flow`

| Value | Behavior |
|---|---|
| `0` | From splash → **Main**, else → **close** |
| `1` | **Interstitial** → (from splash → Main, else → close) |
| else | **Main** |

## Verifying which values are used

```kotlin
val nav = NavigationFlowManager.getInstance(context)
nav.loadFromRemoteConfig()
nav.logConfig()
```

```
║ NAVIGATION CONFIG    source: REMOTE CONFIG    <- or "APP DEFAULT (setConfig)"
║ get_started_variant = 1   (0=direct..., 1=button+banner, ...)
║ first_launch_flow   = 0   (0=lang/onboarding, ...)
...
║ languageSelected = false | onboardingDone = false
║ => isFirstLaunch = true
```

`source` tells you whether a value came from Remote Config or the app's
`setConfig(...)` defaults. Read individual values via
`nav.config.splash.getStartedVariant`, etc., and `nav.configSource` for the
source.

## State the SDK persists

Stored in `SharedPreferences` (`com.ozi.ads.navigation`):

- `language_selected` — set `true` by `onLanguageSelected(...)`
- `onboarding_done` — set `true` by `onOnboardingComplete(...)`

`isFirstLaunch()` is derived from both. Use `resetLaunchState()` to clear them
when re-testing the first-launch journey (or `adb shell pm clear <package>`).

Everything else — which screen is "main"/"premium", how to show ads — stays in
your app; each project maps its own Activities/Fragments to the flow numbers
above.

## Change a flow with no release

Edit the `navigation_configuration` values in Firebase Remote Config and
publish — see `navigation_config_template.json` at the root of the SDK repo,
which includes `_help` fields explaining every value (the parser ignores keys
starting with `_`, so they're safe to keep in the console).
