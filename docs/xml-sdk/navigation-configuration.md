---
sidebar_position: 5
title: Navigation Configuration
---

# Navigation Configuration

A small, config-driven navigation layer for the **splash → language → onboarding
→ premium → main** journey. It works the same whether your screens are Activities
or Fragments.

- The journey is an **ordered list of screens per launch type**, kept in
  Remote Config. Move a screen within the list and it appears somewhere else in the
  app — no release.
- The SDK decides **what happens next**; your app performs the actual navigation
  and ad display through a `NavigationHost` implementation.
- Flow logic lives in one Remote Config key, **`app_navigation_configuration`**,
  carrying **flow logic only — no ad unit IDs**. Ads are shown through your
  existing `AdMobManager` (IDs come from `ad_configuration` — see
  [Remote Config](/xml-sdk/remote-config)).
- It reuses the **same Firebase fetch** as the ad config — nothing extra to fetch.

:::warning[2.1.x reads a new key with a new schema]
Version `2.1.x` reads **`app_navigation_configuration`** (journey lists,
`config_version` **2**). The older **`navigation_configuration`** parameter (the
integer `first_launch_flow` / `second_launch_flow` / `completion_flow` / `close_flow`
fields, `config_version` 1) is **no longer read** by the SDK.

- Create the new parameter in the Firebase console, or rely on the default JSON
  file shipped in the app (below).
- **Leave the old parameter untouched** while apps on `2.0.x` or older are in use —
  the two keys never see each other's value.
- A version-1 value placed in the new key is rejected and the next fallback applies.
- If you build a `NavigationConfig(...)` in code with the old fields, it no longer
  compiles. See [Migrating from version 1](#migrating-from-version-1).
:::

## Integration at a glance

| Where | What you call |
|---|---|
| `Application.onCreate` | Put `default_navigation_configuration.json` in `assets/`, pass it with `RemoteConfigDefaults…setNavigationConfigurationAsset(...)`, call `initWithRemoteConfig(...)` |
| Splash screen | `ads.startup.start(...)` (it loads the navigation config) → read the Get Started variant to build the UI → `nav.onSplashContinue(host)` |
| Language screen | `nav.onLanguageSelected(host, fromSplash)` on Done |
| Onboarding screen | `nav.onOnboardingComplete(host)` when finished |
| Premium screen | `nav.onPremiumClose(host, fromSplash)` on close or back |
| Premium offer screen | `nav.onPremiumOfferClose(host, fromSplash)` on close or back |

The SDK never navigates or shows ads itself — every step goes through your
`NavigationHost` implementation.

## 1. Default JSON and the Application class

The default is a **JSON file**, passed exactly like `default_ad_configuration.json`.
It has the same schema as the remote parameter, so the file and the Firebase value
are interchangeable:

```json title="app/src/main/assets/default_navigation_configuration.json"
{
  "config_version": 2,
  "splash": {
    "show_consent": true,
    "first_launch_get_started_variant": 0,
    "second_launch_get_started_variant": 0
  },
  "flows": {
    "first_launch": ["language", "onboarding", "main"],
    "second_launch": ["main"]
  },
  "screens": {}
}
```

```kotlin title="MyApplication.kt"
class MyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        AdMobManager.getInstance(this)
            .setPremium(false)
            .setDeferAdsInit(true)
            .initWithRemoteConfig(
                appId = "ca-app-pub-XXXXXXXX~YYYYYYYY",
                isDebug = BuildConfig.DEBUG,
                defaults = RemoteConfigDefaults.Companion.Builder()
                    .setAdConfigurationAsset(this, "default_ad_configuration.json")
                    // Used until `app_navigation_configuration` is fetched, and offline.
                    .setNavigationConfigurationAsset(this, "default_navigation_configuration.json")
                    .build()
            )
    }
}
```

The [Startup Flow](/xml-sdk/startup-flow) loads the navigation config for you once
Remote Config resolves. If you **don't** use it, load it yourself in the
`initWithRemoteConfig` callback:

```kotlin
.initWithRemoteConfig(appId = "...", isDebug = BuildConfig.DEBUG, defaults = defaults) {
    NavigationFlowManager.getInstance(this).apply {
        loadFromRemoteConfig()
        logConfig()   // optional: verify the source and every value
    }
}
```

**Which value wins**

1. The fetched `app_navigation_configuration` parameter.
2. Else the default JSON file above.
3. Else the in-code `NavigationConfig()` defaults — or whatever you passed to
   `nav.setConfig(...)`, still available as a last-resort fallback.

If a value is present but invalid, the next one down is used. `logConfig()` prints
which one applied as `source`: `REMOTE CONFIG`,
`DEFAULT JSON (setNavigationConfigurationAsset)`, `APP DEFAULT (setConfig)` or
`APP DEFAULT (invalid JSON)`.

:::warning[The fetch is asynchronous]
Read the config only after Remote Config has resolved. Until `loadFromRemoteConfig()`
runs, `nav.config` holds the in-code `NavigationConfig()` defaults — **not** your default
JSON file, which is only read when the config is loaded. The startup flow guarantees this: by the time its callback runs, the
navigation config is loaded.
:::

## 2. Splash screen

Run the startup flow, build the UI from the Get Started variant, and hand the click
to the SDK. `isFirstLaunch()` decides which of the two variant fields applies:

```kotlin title="SplashActivity.kt"
class SplashActivity : AppCompatActivity() {
    private val nav by lazy { NavigationFlowManager.getInstance(this) }
    private val ads by lazy { AdMobManager.getInstance(application) }
    private val host by lazy { AppNavigationHost(this, AdPlacementKeys.SPLASH_INTERSTITIAL) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(binding.root)

        ads.startup.start(this) { result ->
            if (isFinishing || isDestroyed) return@start
            // The navigation config is loaded by now.
            ads.initializeAds(
                onInitializationComplete = { setupSplash() },
                onInitializationFailed = { setupSplash() }
            )
        }
    }

    private fun setupSplash() {
        val variant = if (nav.isFirstLaunch()) nav.config.splash.firstLaunchGetStartedVariant
                      else nav.config.splash.secondLaunchGetStartedVariant
        when (variant) {
            0 -> nav.onSplashContinue(host)           // direct — no button
            1 -> { showGetStartedButton(); loadBanner() }
            2 -> { showGetStartedButton(); loadNative() }
            else -> showGetStartedButton()            // button only
        }
        btnGetStarted.setOnClickListener { nav.onSplashContinue(host) }
    }
}
```

`onSplashContinue` (called immediately for variant `0`, or from the button for
variants `1`-`3`) re-checks the launch state, picks the `first_launch` or
`second_launch` list and opens its first applicable step. The splash only decides
*what to render*, never *where to go next*.

The two variant fields are independent: a common setup is `1` (button + banner) for a
first-time user and `0` (direct) for everyone after.

## 3. Implement NavigationHost

Does the actual navigation (Activity `startActivity` or a Fragment transaction) and
shows ads through `AdMobManager`. **Every ad callback must run its continuation** —
even when the ad is skipped, fails or the user is premium — or the flow stalls.
Create a fresh host per screen and pass the interstitial placement that matches it.

```kotlin title="AppNavigationHost.kt"
class AppNavigationHost(
    private val activity: AppCompatActivity,
    private val interstitialPlacement: String = AdPlacementKeys.INTERNAL_APP_INTERSTITIAL
) : NavigationHost {

    private val ads = AdMobManager.getInstance(activity.application)

    override fun openLanguage() {
        // The SDK only calls this as a journey step, so flag it as "from splash".
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

    // Optional: the default opens the regular premium screen.
    override fun openPremiumOffer(fromSplash: Boolean) {
        activity.startActivity(Intent(activity, PremiumOfferActivity::class.java)
            .putExtra(PremiumOfferActivity.EXTRA_FROM_SPLASH, fromSplash))
        activity.finish()
    }

    override fun close() { activity.finish() }

    override fun showInterstitial(point: String?, onComplete: () -> Unit) {
        // Resolved from the *ad* config by placement — never from the navigation JSON.
        ads.interstitialAdLoader.loadAndShowAdForPlacement(
            activity,
            placementKey = interstitialPlacement,
            showDialog = true,
            timeoutMillis = 8000,
            point = point,
            onSuccessListener = { onComplete() }   // the continuation always runs
        )
    }

    override fun showAppOpenAd(onComplete: (shown: Boolean) -> Unit) {
        val loader = ads.appOpenAdLoader
        if (loader.isStartAdAvailable()) {
            loader.showAppOpenAdIfAvailable { shown -> onComplete(shown ?: false) }
        } else {
            // Not preloaded yet — try to load once, then show (or report not shown).
            loader.loadAppOpenAd(activity) { loaded ->
                if (loaded == true) loader.showAppOpenAdIfAvailable { shown -> onComplete(shown ?: false) }
                else onComplete(false)
            }
        }
    }
}
```

**Per-step points.** `showInterstitial` receives a `point` token naming the
navigation step, so Remote Config can block an interstitial at one step without
touching the same placement elsewhere (see
[Remote Config → Per-point control](/xml-sdk/remote-config#per-point-control)):

| Token | When |
|---|---|
| `before_language`, `before_onboarding`, `before_premium`, `before_premium_offer`, `before_main` | The `ad_before` of that step |
| `close_language`, `close_premium`, `close_premium_offer` | The `ad_on_close` when a screen opened from inside the app is closed |

Pass `point` straight through, as above.

**`openPremiumOffer` is optional.** Hosts written before it existed, in Kotlin or Java,
keep compiling: its default calls `openPremium(fromSplash)`. Override it to show a
separate offer screen.

## 4. Language, onboarding, premium and premium offer screens

```kotlin
// LANGUAGE — reachable two ways:
//  • as a journey step (openLanguage sets EXTRA_FROM_SPLASH = true):
//      Done → persists the selection → opens the next step.   Back → blocked.
//  • from inside the app (a plain intent, e.g. Settings):
//      Done → persists the selection → closes back to the source.   Back → goes back.
private val fromSplash by lazy { intent.getBooleanExtra(EXTRA_FROM_SPLASH, false) }

btnDone.setOnClickListener { nav.onLanguageSelected(host, fromSplash) }

onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(fromSplash) {
    override fun handleOnBackPressed() { /* blocked on the journey */ }
})
```

```kotlin
// ONBOARDING — when finished:
nav.onOnboardingComplete(host)   // persists onboardingDone, opens the next step
```

```kotlin
// PREMIUM and PREMIUM OFFER — the close button and back both run the close flow:
private val fromSplash by lazy { intent.getBooleanExtra(EXTRA_FROM_SPLASH, false) }

btnClose.setOnClickListener { nav.onPremiumClose(host, fromSplash) }      // premium
// btnClose.setOnClickListener { nav.onPremiumOfferClose(host, fromSplash) } // premium_offer
onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
    override fun handleOnBackPressed() { nav.onPremiumClose(host, fromSplash) }
})
```

When `fromSplash` is `true` the screen finished a journey step and the next step
opens. When it is `false` (opened from inside the app) the screen just closes, after
its `ad_on_close` if one is configured.

## Flow reference

### Splash — Get Started variants

`first_launch_get_started_variant` and `second_launch_get_started_variant` are set
independently for a first-time and a returning user:

| Value | UI |
|---|---|
| `0` | Direct flow, **no** button — navigation runs immediately |
| `1` | "Get Started" button + **Banner** ad |
| `2` | "Get Started" button + **Native** ad |
| `3` | "Get Started" button only |

### First launch vs returning user

A user is on the **first-launch** journey until *both* are true: `languageSelected`
and `onboardingDone`.

```
isFirstLaunch = !(languageSelected && onboardingDone)
```

- Language not selected → first launch.
- Language selected but onboarding unfinished → still first launch (the language step
  is skipped, the rest of the list runs).
- Both done → returning user, who runs `flows.second_launch`.

The launch type is **fixed when the user leaves splash**, so finishing onboarding
mid-journey does not switch the rest of the journey to the second-launch list.

### Journeys — flows.first_launch and flows.second_launch

An **ordered list** of the screens visited after splash. When a screen finishes
(`onLanguageSelected`, `onOnboardingComplete`, `onPremiumClose`,
`onPremiumOfferClose`), the next applicable step in the same list opens. `main` ends
the journey and is implied when the list runs out. **To move a screen, move it in the
list.**

```json
"flows": {
  "first_launch":  ["language", "premium", "onboarding", "main"],
  "second_launch": [{ "screen": "premium", "ad_before": "interstitial" }, "main"]
}
```

| Want | `first_launch` |
|---|---|
| Premium right after splash | `["premium","language","onboarding","main"]` |
| Premium after language | `["language","premium","onboarding","main"]` |
| Premium after onboarding | `["language","onboarding","premium","main"]` |
| No premium | `["language","onboarding","main"]` |
| Premium after splash, offer paywall after onboarding | `["premium","language","onboarding","premium_offer","main"]` |
| Interstitial before language | `[{"screen":"language","ad_before":"interstitial"},"onboarding","main"]` |

| Want | `second_launch` |
|---|---|
| Straight to main | `["main"]` |
| Interstitial, then main | `[{"screen":"main","ad_before":"interstitial"}]` |
| App-open ad, then main | `[{"screen":"main","ad_before":"app_open"}]` |
| App-open (interstitial if it can't show), then main | `[{"screen":"main","ad_before":"app_open_then_interstitial"}]` |
| Premium, then main | `["premium","main"]` |
| Interstitial, premium, then main | `[{"screen":"premium","ad_before":"interstitial"},"main"]` |

### Steps

A **step** is a screen name — `language`, `onboarding`, `premium`, `premium_offer` or
`main` — or an object:

| Field | Default | Meaning |
|---|---|---|
| `screen` | — | Which screen. Unknown names are logged and skipped |
| `ad_before` | `none` | The ad shown before the screen opens (below) |
| `enabled` | `true` | `false` skips the step without deleting it |
| `skip_if_done` | `true` | `language` and `onboarding` only: skip when the user already completed it. `false` always shows it |

`ad_before` values:

| Value | Behavior |
|---|---|
| `none` | No ad |
| `interstitial` | An interstitial, then the screen |
| `app_open` | An app-open ad, then the screen — **whether or not the ad was shown** |
| `app_open_then_interstitial` | An app-open ad; if it couldn't be shown, an interstitial instead; then the screen |

`premium_offer` is the offer paywall: a **separate screen from `premium`**, so one
journey can show both. It supports the same `ad_before`, `enabled` and `screens`
fields as `premium`.

### Skipping rules

- `premium` and `premium_offer` are skipped for premium users (`AdMobManager.isPremium`).
- `language` and `onboarding` are skipped when already done, unless `skip_if_done` is `false`.
- A step with `enabled: false`, or whose `screens` override says `enabled: false`, is skipped.
- `main` is never skipped; it always ends the journey. Steps listed after `main` are never reached.
- If the same screen is listed twice, only the first is kept (a repeat would loop).
- An empty or unusable list falls back to `["main"]`. If a finished screen isn't in the
  active list, the journey goes to `main`.
- Unknown screen or ad names are logged and ignored; they never crash.

**A first-launch journey that reaches `main` marks language and onboarding as done**,
even if the list left them out or disabled them, so the user moves to the
`second_launch` list on the next launch. Quitting before `main` leaves them undone.

### Per-screen refinements

Optional. Use `screens.<screen>.<first_launch|second_launch>` when a screen needs
different behavior on a first versus second launch:

```json
"screens": {
  "premium": {
    "first_launch":  { "ad_on_close": "interstitial" },
    "second_launch": { "enabled": false }
  }
}
```

| Field | Meaning |
|---|---|
| `enabled` | `false` skips this screen for that launch type |
| `ad_before` | The ad before this screen opens — used only when the step itself sets no `ad_before` |
| `ad_on_close` | The ad shown when the screen is closed back to where it came from — opened from inside the app (`fromSplash = false`), for example Premium or Language from Settings — before `host.close()` |

The ad before a step is taken from the **step first**, then the **`screens` override**,
then `none`.

### Language done

Not remote-configured — it follows how the screen was opened:

| Reached via | Done | Back |
|---|---|---|
| Journey (`EXTRA_FROM_SPLASH = true`) | Opens the next step | Blocked |
| Inside the app (a plain intent) | Closes back to the source | Goes back |

## Sample app_navigation_configuration JSON

This is the maintained template, `navigation_config_template.json` at the root of
the SDK repo — paste it into Firebase Remote Config (key
`app_navigation_configuration`, type **JSON**) and edit the values. Keys starting
with `_` are documentation only: the parser ignores anything it doesn't recognize, so
they are safe to keep or delete.

```json title="navigation_config_template.json"
{
  "app_navigation_configuration": {
    "_readme": "Flow logic only — NO ad IDs here (ads come from remote_config_json). Fields starting with _ are documentation and are ignored by the parser; keep or delete them freely.",
    "config_version": 2,

    "splash": {
      "show_consent": true,
      "_show_consent_help": "true = show Google UMP consent form on splash before continuing; false = skip it.",

      "first_launch_get_started_variant": 1,
      "second_launch_get_started_variant": 0,
      "_get_started_variant_help": "0 = direct flow, no button (navigate immediately) | 1 = 'Get Started' button + Banner ad | 2 = button + Native ad | 3 = button only. Set independently for a first-time vs a returning user."
    },

    "flows": {
      "_flows_help": "Ordered screens visited AFTER splash, per launch type. When a screen finishes, the next applicable step in the same list opens; 'main' ends the journey (and is implied if the list runs out). To move Premium, move it in the list. Screens: language | onboarding | premium | main. A step is a screen name, or { \"screen\": ..., \"ad_before\": ..., \"enabled\": true, \"skip_if_done\": true }. ad_before: none | interstitial | app_open | app_open_then_interstitial (app-open, and an interstitial if it could not be shown). language/onboarding are skipped when already done unless skip_if_done is false; premium is skipped for premium users.",

      "first_launch": [ "language", "onboarding", "main" ],
      "_first_launch_help": "New user (language not selected OR onboarding not done). Examples: Premium right after splash = [\"premium\",\"language\",\"onboarding\",\"main\"] | after language = [\"language\",\"premium\",\"onboarding\",\"main\"] | after onboarding = [\"language\",\"onboarding\",\"premium\",\"main\"]. An interstitial before language = [{\"screen\":\"language\",\"ad_before\":\"interstitial\"},\"onboarding\",\"main\"].",

      "second_launch": [ "main" ],
      "_second_launch_help": "Returning user (language selected AND onboarding done). Examples: Premium first = [\"premium\",\"main\"] | App-open then Main = [{\"screen\":\"main\",\"ad_before\":\"app_open\"}] | Interstitial then Premium then Main = [{\"screen\":\"premium\",\"ad_before\":\"interstitial\"},\"main\"]."
    },

    "screens": {
      "_screens_help": "Optional per-screen, per-launch refinements (keys: screen name, then first_launch / second_launch). enabled:false skips that screen for that launch type. ad_before applies when the step itself sets none. ad_on_close = ad shown when the screen is closed back to where it came from (e.g. Premium opened from Settings, Language opened from Settings).",
      "premium": {
        "first_launch": { "enabled": true },
        "second_launch": { "enabled": true, "ad_on_close": "none" }
      }
    }
  }
}
```

The parser accepts either the wrapped object (as above) or just the inner object —
the default file in `assets/` uses the inner form. Use `config_version` `2`: a
value of `1` or lower is rejected (it may be omitted when a `flows` block is present,
which counts as `2`).

| Path | Default | Meaning |
|---|---|---|
| `config_version` | `2` | The schema version. `1` or lower is rejected; omitted counts as `2` only when `flows` is present |
| `splash.show_consent` | `true` | Run the consent step of the startup flow |
| `splash.first_launch_get_started_variant` | `0` | Splash UI for a first-time user |
| `splash.second_launch_get_started_variant` | `0` | Splash UI for a returning user |
| `flows.first_launch` | `["language","onboarding","main"]` | The journey for a first-time user |
| `flows.second_launch` | `["main"]` | The journey for a returning user |
| `screens` | none | Optional per-screen, per-launch refinements |

A missing or malformed field silently falls back to its default; the parser never
crashes the app.

## Migrating from version 1

The integer fields `first_launch_flow`, `second_launch_flow`, `completion_flow` and
`close_flow` are gone. Rewrite them as `flows`:

| Old (`navigation_configuration`, v1) | New (`app_navigation_configuration`, v2) |
|---|---|
| `second_launch_flow: 0` (main) | `"second_launch": ["main"]` |
| `second_launch_flow: 1` (interstitial → main) | `"second_launch": [{"screen":"main","ad_before":"interstitial"}]` |
| `second_launch_flow: 2` (open ad, interstitial on failure → main) | `"second_launch": [{"screen":"main","ad_before":"app_open_then_interstitial"}]` |
| `second_launch_flow: 3` (open ad → main) | `"second_launch": [{"screen":"main","ad_before":"app_open"}]` |
| `second_launch_flow: 4` (premium) | `"second_launch": ["premium","main"]` |
| `second_launch_flow: 5` (interstitial → premium) | `"second_launch": [{"screen":"premium","ad_before":"interstitial"},"main"]` |
| `first_launch_flow: 0` (language / onboarding) | `"first_launch": ["language","onboarding","main"]` |
| `first_launch_flow: 1` (interstitial first) | `"first_launch": [{"screen":"language","ad_before":"interstitial"},"onboarding","main"]` |
| `completion_flow: 0` (onboarding → main) | `"first_launch": ["language","onboarding","main"]` |
| `completion_flow: 1` (interstitial → main) | `"first_launch": ["language","onboarding",{"screen":"main","ad_before":"interstitial"}]` |
| `completion_flow: 2` (premium after onboarding) | `"first_launch": ["language","onboarding","premium","main"]` |
| `completion_flow: 3` (interstitial → premium) | `"first_launch": ["language","onboarding",{"screen":"premium","ad_before":"interstitial"},"main"]` |
| `close_flow: 0` (premium closes) | The default: the next step opens, or the screen closes when opened from inside the app |
| `close_flow: 1` (interstitial when premium closes) | In a journey, put `ad_before: "interstitial"` on the step that follows premium. For premium opened from inside the app, set `"ad_on_close": "interstitial"` under `screens.premium` |

**In code.** `OnboardingConfig`, `PremiumConfig` and the `firstLaunchFlow` /
`secondLaunchFlow` fields of `SplashConfig` no longer exist, so a `setConfig` call
built with them stops compiling. Prefer the default JSON file; if you still want an
in-code fallback, build the new shape:

```kotlin
NavigationFlowManager.getInstance(this).setConfig(
    NavigationConfig(
        splash = SplashConfig(showConsent = true),
        flows = Flows(
            firstLaunch = listOf(FlowStep(Screen.LANGUAGE), FlowStep(Screen.ONBOARDING), FlowStep(Screen.MAIN)),
            secondLaunch = listOf(FlowStep(Screen.MAIN))
        )
    )
)
```

## Verifying which values are used

```kotlin
val nav = NavigationFlowManager.getInstance(context)
nav.loadFromRemoteConfig()   // not needed after the startup flow, which already did it
nav.logConfig()
```

```
╔═══════════════════════════════════════════════════════════════
║ NAVIGATION CONFIG    source: REMOTE CONFIG
║ config_version: 2
╠─ SPLASH ──────────────────────────────────────────────────────
║ show_consent        = true   (true=show UMP form on splash)
║ first_launch_get_started_variant  = 1   (0=direct/no-button, 1=button+banner, 2=button+native, 3=button only)
║ second_launch_get_started_variant = 0   (same meaning, for a returning user)
╠─ FLOWS ───────────────────────────────────────────────────────
║ first_launch = splash → language → premium → onboarding → main
║ second_launch = splash → [interstitial] premium → main
╠─ LAUNCH STATE (persisted) ────────────────────────────────────
║ languageSelected = false | onboardingDone = false
║ => isFirstLaunch = true
╚═══════════════════════════════════════════════════════════════
```

Each step prints as `[ad_before] screen`, with `(disabled)` after a disabled one.
Read individual values at runtime through `nav.config.splash`, `nav.config.flows` and
`nav.configSource`.

## State the SDK persists

Stored in `SharedPreferences` (`com.ozi.ads.navigation`):

- `language_selected` — set `true` by `onLanguageSelected(...)`
- `onboarding_done` — set `true` by `onOnboardingComplete(...)`, or by reaching `main` on a first-launch journey

`isFirstLaunch()` is derived from both. Use `resetLaunchState()` to clear them when
re-testing the first-launch journey (or `adb shell pm clear <package>`).

Everything else — which screen is "main" or "premium", how to show ads — stays in
your app; each project maps its own Activities and Fragments to the screen names.

## Change a flow with no release

Edit the `app_navigation_configuration` value in Firebase Remote Config and publish.
The SDK reuses the same fetch as the ad configuration, so there is nothing extra to
wire up.
