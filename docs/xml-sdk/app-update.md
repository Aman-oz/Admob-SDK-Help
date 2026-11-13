---
sidebar_position: 4
title: In-App Updates
---

# In-App Updates

Google Play in-app updates, switched on and off from Firebase Remote Config. A
single value, `app_update_type`, decides whether the app offers an update and
which kind. The code lives in its own package (`domain.app_update`,
`AppUpdateController`) and is deliberately independent of the ad loaders, so it
can change without touching ads.

:::info[Added in 2.1.0]
Reach it as `AdMobManager.getInstance(application).appUpdate`. Nothing happens
unless you call it (or run the [Startup Flow](/xml-sdk/startup-flow), which does).
:::

## app_update_type

A per-environment value in the `ad_configuration` JSON, next to the pacing keys
(see [Remote Config](/xml-sdk/remote-config)):

| `app_update_type` | Behavior |
|---|---|
| `0` | **Flexible** — a dialog with *No thanks* / *Update*, then Play downloads in the background while the user keeps using the app. An "Install" snackbar appears when the download is done |
| `1` | **Immediate** — Play's full-screen, blocking update screen |
| anything else, or the key is absent | **No update.** The templates ship `-1` |

```json title="ad_configuration → release_ad_configuration"
{
  "ads_enabled": true,
  "resume_delay_sec": 5,
  "app_update_type": 0
}
```

- It is read from the block that matches the build — `debug_ad_configuration` for
  debug builds, `release_ad_configuration` for release — so a release app needs the key
  in the **release** block.
- It is **independent of `ads_enabled` and premium**: a user with ads turned off
  still gets update prompts.
- It is re-read on every call, so a value changed in the console applies after the
  next fetch, with no release.

## Using it

Two entry points, depending on who starts the check. Both need a
`ComponentActivity` (any `AppCompatActivity`), and the SDK attaches a lifecycle
observer to it, so there is nothing to wire into `onResume` or `onDestroy`.

```kotlin
val update = AdMobManager.getInstance(application).appUpdate

// Splash or main screen: checks in the background
update.checkForUpdate(this) { offered -> /* true = an update exists and was offered */ }

// Settings "Check for update" button: shows progress, then the result either way
update.checkForUpdateManually(this) { offered -> }
```

| | `checkForUpdate` | `checkForUpdateManually` |
|---|---|---|
| Use from | Splash or main screen | A Settings button |
| While checking | **Nothing** is shown | "Checking for updates…" with a spinner (on screen at least 0.8 s) |
| Flexible update available | The update dialog, *No thanks* / *Update* | The same dialog changes into the update dialog |
| Immediate update available | Play's full-screen screen opens directly | The dialog closes and Play's screen takes over |
| No update | Nothing | "You are already using the latest version." with **OK** |
| Check failed or Play silent for 10 s | Nothing | "Couldn't check for updates…" with **OK** |
| `onResult(true)` means | An update exists and was offered | Same, delivered when the dialog moves to its result state |

When `app_update_type` is disabled (`-1`, or the key is absent), neither method
shows anything and both report `false`. A call made while the update dialog is
already on screen is ignored and reports `false`. The dialog can never hang: a
10 s cap ends a check Play never answers.

Both take `(activity, uiModel = AppUpdateUiModel(), onResult)`.

### Later screens

If the user taps *Update* on the splash and the flexible download finishes while
they are on another screen, that screen needs to be listening for it. Call
`attach` on screens that can be open after the update was offered (typically the
main screen):

```kotlin
AdMobManager.getInstance(application).appUpdate.attach(this)
```

`attach` doesn't query Play and shows no dialog. It only makes that screen show the
"Install" snackbar for a finished download, and resume an immediate update the user
left half-way. It does nothing when updates are disabled.

## In the startup flow

The [Startup Flow](/xml-sdk/startup-flow) runs the update step for you, starting
Play's query at the very beginning so the answer is usually ready when needed. It
reports **when the user has decided**, not when the dialog appears:

| Outcome | Meaning |
|---|---|
| `DISABLED` | `app_update_type` isn't `0`/`1`, or `checkUpdate = false` |
| `NO_UPDATE` | Play has nothing newer for this build |
| `DECLINED` | The user tapped *No thanks*, or cancelled Play's own sheet (flexible only) |
| `ACCEPTED` | Flexible: the user accepted and the download has started. Immediate: Play updated the app |
| `FAILED` | Play didn't answer within `updateQueryTimeoutMs` (5 s), the query failed, or the flow couldn't start |

**Flexible:** the flow waits for the tap on *Update* / *No thanks* and, after *Update*,
for the answer to Play's own download sheet — not for the download itself. **Immediate** is mandatory, so if the user backs out of Play's screen, a
dialog with no *No thanks* button re-offers the update until they accept it. If
Play no longer reports it as available, the flow ends with `DECLINED`.

## Customizing

Pass an `AppUpdateUiModel`; every `null` field falls back to the SDK's default text.

```kotlin
update.checkForUpdateManually(
    this,
    AppUpdateUiModel(
        title = "New version",
        message = "Faster scanning and fixes.",
        updateText = "Get it",
        accentColor = Color.parseColor("#174700")
    )
)
```

| Field | Default text | Used when |
|---|---|---|
| `title` | Update available | An update is available |
| `message` | A new version is available. You can keep using the app while it downloads. | A flexible update is available |
| `requiredMessage` | This update is required to keep using the app. | A mandatory update is re-offered |
| `updateText` / `noThanksText` | Update / No thanks | The two buttons |
| `installPromptText` / `installText` | Download has been completed. / Install | The snackbar after a flexible download |
| `checkingTitle` / `checkingMessage` | Checking for updates... / Please wait while we check for updates... | Manual check, while checking |
| `noticeTitle` | Check for updates | Manual check, "latest version" and failure notices |
| `upToDateMessage` | You are already using the latest version. | Manual check, no update |
| `checkFailedMessage` | Couldn't check for updates. Please try again later. | Manual check, the check failed |
| `okText` | OK | The button on those notices |
| `accentColor` | the SDK's green and blue | Tint for the spinner and buttons |
| `cancelable` | `false` | Whether back or an outside tap closes the update dialog. Mandatory updates are never cancellable |

**Translating.** Every default is an Android string resource named `app_update_*`
(`app_update_title`, `app_update_message`, `app_update_required_message`,
`app_update_button_update`, `app_update_button_no_thanks`,
`app_update_download_complete`, `app_update_install`, `app_update_checking_title`,
`app_update_checking_message`, `app_update_notice_title`, `app_update_up_to_date`,
`app_update_button_ok`, `app_update_check_failed`, `app_update_google_play`).
Declare a string with the same name in your app's `strings.xml`, or in
`values-xx/strings.xml`, to replace or translate it. No code needed.

`appUpdate.mode` reads the current setting: `FLEXIBLE`, `IMMEDIATE` or `NONE`.

## Preview the flexible update UI

In a **debug build** you can see exactly what a user sees without a real update on
Play:

```kotlin
AdMobManager.getInstance(application).appUpdate.previewFlexibleUpdate(this)
```

It plays the whole flexible journey with the real SDK dialog: the checking state,
the update dialog with *No thanks* / *Update*, then (after *Update*) a simulated
download and the real "Install" snackbar. Tapping *Install* only shows a toast;
nothing is installed. It ignores `app_update_type`, so it works while updates are
disabled, and it does nothing (and reports `false`) in a release app.

Google draws two screens, so they can't be previewed: Play's own "download in the
background?" sheet that follows *Update*, and the immediate-update screen. For those,
test a real update.

## Testing a real update

The in-app update API only works for a build **installed by Google Play**. A build
installed with `adb` or Android Studio always reports "no update". Internal App
Sharing is the quickest way to get a real one:

1. In `release_ad_configuration` set `"app_update_type": 0` (or `1`). A release build
   reads the release block.
2. Build **two signed builds** with the same `applicationId` and the **same signing
   key**: one with a lower `versionCode` (the one you install), one higher (the update).
3. Upload both in Play Console → **Internal app sharing**.
4. Install the *lower* build from its sharing link — **not** with `adb`.
5. Open the *higher* build's link but don't install it.
6. Launch the lower build from the launcher.

Watch it with:

```bash
adb logcat | grep -E "AppUpdateController|StartupFlow"
```

Cases worth a run:

| Case | How | Expected |
|---|---|---|
| Flexible | `app_update_type` = `0` | Dialog, then Play's sheet, a background download, then the "Install" snackbar |
| Immediate | `app_update_type` = `1` | Play's full-screen screen; backing out in the startup flow shows the mandatory dialog |
| Disabled | `-1` or the key removed | Nothing appears |
| Up to date | Install the *higher* build | The manual check says "already using the latest version" |
| Play slow or offline | Airplane mode | The splash continues after the cap; a manual check shows the failure notice |

If Play reports no update, check that the update's `versionCode` is higher, both builds
are signed with the same key, and give Play a minute. To repeat the test, uninstall
and reinstall the lower build from its link.

## Requirements and gotchas

- **Play-installed builds only.** Sideloaded, `adb`-installed and emulator builds without
  Play always report "no update".
- **Dependency.** `com.google.android.play:app-update:2.1.0` comes in with the SDK; you
  don't declare it. Nothing needs adding to the manifest.
- **Theme.** The "Install" snackbar needs an AppCompat or Material activity theme. If it
  can't be shown, the SDK logs an error and skips it rather than crashing.
- **Version codes.** An update is offered only when Play's `versionCode` is higher than
  the installed one.
- **It ignores premium.** Don't gate it on `AdMobManager.isPremium`; it is separate on
  purpose.
