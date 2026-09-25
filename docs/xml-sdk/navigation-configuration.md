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
  [Remote Config](/xml-sdk/remote-config)).
- It reuses the **same Firebase fetch** as the ad config — nothing extra to fetch.

## Integration at a glance

| Where | What you call |
|---|---|
| `Application.onCreate` | 1. `nav.setConfig(defaults)` → 2. `initWithRemoteConfig(...)` → 3. in its callback: `nav.loadFromRemoteConfig()` |
| Splash screen | Wait for the fetch → check `nav.isFirstLaunch()` → read `firstLaunchGetStartedVariant` or `secondLaunchGetStartedVariant` accordingly to build the UI → `nav.onSplashContinue(host)` |
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
                    showConsent = false,               // show UMP consent form on splash
                    firstLaunchGetStartedVariant = 1,  // 0=direct, 1=button+banner, 2=button+native, 3=button only — for a first-time user
                    secondLaunchGetStartedVariant = 0, // same 0-3 meaning, for a returning user — set independently
                    firstLaunchFlow = 0,                // 0=lang/onboarding, 1=interstitial first, else=main
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

`firstLaunchGetStartedVariant` and `secondLaunchGetStartedVariant` are independent —
a common setup is `1` (button + banner) for a first-time user, so a new user
gets a beat with the value proposition before continuing, and `0` (direct, no
button) for every later launch so a returning user isn't slowed down. Both
default to `0` if you don't set them.

:::warning[The fetch is asynchronous]
If your splash reads the config immediately it would still see the defaults —
the splash must wait for the callback above (a `@Volatile` result + waiter
list is a common pattern for that readiness gate).
:::

## 2. Splash screen

Wait for the fetch, pick **which** variant field applies via
`nav.isFirstLaunch()`, build the UI from it, and hand the click to the SDK:

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
        // isFirstLaunch() decides which of the two variant fields applies —
        // a first-time user and a returning user can show a completely
        // different splash UI without touching the other's flow.
        val variant = if (nav.isFirstLaunch()) nav.config.splash.firstLaunchGetStartedVariant
                      else nav.config.splash.secondLaunchGetStartedVariant

        when (variant) {
            0 -> nav.onSplashContinue(host)   // direct — no button
            1 -> { showGetStartedButton(); loadBanner() }
            2 -> { showGetStartedButton(); loadNative() }
            else -> showGetStartedButton()    // button only
        }
        btnGetStarted.setOnClickListener { nav.onSplashContinue(host) }
    }
}
```

`onSplashContinue` (called either immediately for variant `0` or from the
button's click listener for variants `1`-`3`) itself re-checks launch state
and routes to the **first-launch** flow (language → onboarding) or the
**second-launch** flow (main / premium / ads) — the splash screen only needs
to decide *what to render*, never *where to go next*.

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
[Remote Config → Per-point control](/xml-sdk/remote-config#per-point-control).

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

### Splash — `first_launch_get_started_variant` / `second_launch_get_started_variant`

Two independent fields, same `0`-`3` meaning — one applies while
`isFirstLaunch()` is true, the other once the user has completed language +
onboarding at least once:

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
╔═══════════════════════════════════════════════════════════════
║ NAVIGATION CONFIG    source: REMOTE CONFIG
║ config_version: 1
╠─ SPLASH ──────────────────────────────────────────────────────
║ show_consent        = true   (true=show UMP form on splash)
║ first_launch_get_started_variant  = 1   (0=direct/no-button, 1=button+banner, 2=button+native, 3=button only)
║ second_launch_get_started_variant = 0   (same meaning, for a returning user)
║ first_launch_flow   = 0   (0=lang/onboarding, 1=interstitial→lang/onboarding, else=main)
║ second_launch_flow  = 0   (0=main, 1=inter→main, 2=open→(fail:inter)→main, 3=open→main, 4=premium, 5=inter→premium)
╠─ ONBOARDING ──────────────────────────────────────────────────
║ completion_flow     = 0   (0=main, 1=inter→main, 2=premium, 3=inter→premium)
╠─ PREMIUM ─────────────────────────────────────────────────────
║ close_flow          = 0   (0=fromSplash?main:finish, 1=inter→(fromSplash?main:finish))
╠─ LAUNCH STATE (persisted) ────────────────────────────────────
║ languageSelected = false | onboardingDone = false
║ => isFirstLaunch = true
╚═══════════════════════════════════════════════════════════════
```

`source` reads `"REMOTE CONFIG"` when a value came from Remote Config,
`"APP DEFAULT (setConfig)"` when the key was absent and your `setConfig(...)`
defaults were kept, or `"APP DEFAULT (invalid remote JSON)"` if the remote
value existed but failed to parse. Read individual values via
`nav.config.splash.firstLaunchGetStartedVariant` /
`nav.config.splash.secondLaunchGetStartedVariant`, etc., and `nav.configSource`
for the source.

## State the SDK persists

Stored in `SharedPreferences` (`com.ozi.ads.navigation`):

- `language_selected` — set `true` by `onLanguageSelected(...)`
- `onboarding_done` — set `true` by `onOnboardingComplete(...)`

`isFirstLaunch()` is derived from both. Use `resetLaunchState()` to clear them
when re-testing the first-launch journey (or `adb shell pm clear <package>`).

Everything else — which screen is "main"/"premium", how to show ads — stays in
your app; each project maps its own Activities/Fragments to the flow numbers
above.

## Sample `navigation_configuration` JSON

This is the maintained template, `navigation_config_template.json` at the root
of the SDK repo — paste it as-is into Firebase Remote Config (key
`navigation_configuration`, type **JSON**) and edit the values, or use it as
the shape for an app-supplied default. Keys starting with `_` are
documentation only — `NavigationConfigParser` ignores any key it doesn't
recognize, so they're safe to keep or delete freely:

```json title="navigation_config_template.json"
{
  "navigation_configuration": {
    "_readme": "Flow logic only — NO ad IDs here (ads come from remote_config_json). Fields starting with _ are documentation and are ignored by the parser; keep or delete them freely.",
    "config_version": 1,

    "splash": {
      "show_consent": true,
      "_show_consent_help": "true = show Google UMP consent form on splash before continuing; false = skip it.",

      "first_launch_get_started_variant": 1,
      "second_launch_get_started_variant": 0,
      "_get_started_variant_help": "0 = direct flow, no button (navigate immediately) | 1 = 'Get Started' button + Banner ad | 2 = button + Native ad | 3 = button only. Set independently for a first-time vs a returning user.",

      "first_launch_flow": 0,
      "_first_launch_flow_help": "New user (language not selected OR onboarding not done). 0 = go to Language if not selected else Onboarding | 1 = show Interstitial, then Language/Onboarding | any other value = go straight to Main.",

      "second_launch_flow": 0,
      "_second_launch_flow_help": "Returning user (language selected AND onboarding done). 0 = Main | 1 = Interstitial then Main | 2 = App-Open ad; on success Main, on failure Interstitial then Main | 3 = App-Open ad then Main (either way) | 4 = Premium | 5 = Interstitial then Premium | any other value = Main."
    },

    "onboarding": {
      "completion_flow": 0,
      "_completion_flow_help": "Runs when Onboarding finishes. 0 = Main | 1 = Interstitial then Main | 2 = Premium | 3 = Interstitial then Premium | any other value = Main."
    },

    "premium": {
      "close_flow": 0,
      "_close_flow_help": "Runs when Premium is closed/back-pressed. 0 = if reached from splash journey go to Main else finish() | 1 = show Interstitial, then (from splash → Main, else → finish()) | any other value = Main."
    }
  }
}
```

Field-by-field, matching `NavigationConfigParser`'s defensive parsing (a
missing or malformed field silently falls back to its default rather than
crashing):

| Path | Type | Default | Meaning |
|---|---|---|---|
| `config_version` | int | `1` | Bump this when you change the JSON, so `logConfig()`'s output confirms a fetch actually picked up your edit |
| `splash.show_consent` | bool | `true` | Show the UMP consent form on splash before continuing |
| `splash.first_launch_get_started_variant` | int 0-3 | `0` | Splash UI for a first-time user — see the variant table below |
| `splash.second_launch_get_started_variant` | int 0-3 | `0` | Splash UI for a returning user — same meaning, set independently |
| `splash.first_launch_flow` | int | `0` | Where a first-time user goes after splash — see the flow table below |
| `splash.second_launch_flow` | int | `0` | Where a returning user goes after splash |
| `onboarding.completion_flow` | int | `0` | Where the user goes when onboarding finishes |
| `premium.close_flow` | int | `0` | Where the user goes when the premium screen is closed/back-pressed |

## Change a flow with no release

Edit the `navigation_configuration` values in Firebase Remote Config and
publish — the SDK reuses the same fetch as the ad configuration, so there's
nothing extra to wire up. See [Sample JSON](#sample-navigation_configuration-json)
above for the full template.
