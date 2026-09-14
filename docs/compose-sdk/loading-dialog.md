---
sidebar_position: 3
title: Loading Dialog
---

# Loading Dialog

Interstitial's `showAd`/`loadAndShowAd`/`showAndLoadAd` and Rewarded's
`loadAndShowAd` — and their `...ForPlacement` equivalents — can show a
loading dialog themselves while an ad loads, the same idea as the XML SDK's
`LoadingDialog`, rebuilt for Compose.

```kotlin
interstitialAdLoader.loadAndShowAdForPlacement(
    activity = activity,
    placementKey = placementKey,
    showDialog = true,
    dialogModel = LoadingDialogModel(text = "Loading ad…"),
) { proceed -> }
```

## Why this exists as an imperative singleton, not a Composable

Ad loaders are plain Kotlin classes, not Composables — there's no
`remember`/state to drive a normal `@Composable` dialog from inside them the
way you would in UI code. `LoadingDialog.show(activity, model)` /
`LoadingDialog.hide()` is an internal singleton the loaders call directly,
built on `androidx.activity.ComponentDialog` hosting a `ComposeView` — the
same mechanism `androidx.compose.ui.window.Dialog` uses internally, which is
what lets Compose content actually render from a dialog with no enclosing
composition.

You never call `LoadingDialog` yourself — it's `internal` to the SDK. What
you configure is `LoadingDialogModel`, passed as the `dialogModel` parameter.

## `showDialog` and `dialogTimeout`

- **`showDialog: Boolean`** — whether to show the dialog at all for this call. `showAdForPlacement` (ad already warm, likely instant) defaults it to `false`; `loadAndShowAdForPlacement`/`showAndLoadAdForPlacement`/rewarded's `loadAndShowAdForPlacement` (a real network wait) default it to `true`.
- **`dialogTimeout: Long`** (millis) — an artificial *minimum display time* once the ad is actually ready, so the dialog doesn't flash in and vanish instantly. This is independent of `timeoutMillis` (the real "give up and report failure" timeout) — `dialogTimeout` only ever adds a deliberate pause, it never causes a failure. Ignored entirely when `showDialog` is `false`.

```kotlin
interstitialAdLoader.showAdForPlacement(
    activity = activity,
    placementKey = placementKey,
    showDialog = true,
    dialogTimeout = 400, // hold the dialog up for at least 400ms even though the ad was already warm
) { proceed -> }
```

## `LoadingDialogModel`

```kotlin
data class LoadingDialogModel(
    val text: String = "Loading Ad...",
    val textColor: Color = Color.White,
    val textSize: TextUnit = 20.sp,
    val lottieRes: Int? = R.raw.circle_loading_animation, // the SDK's bundled default
    val lottieSize: Dp = 120.dp,
    val backgroundDimAmount: Float = 0.5f,
    val cancelable: Boolean = false,
    val content: (@Composable () -> Unit)? = null,
)
```

`LoadingDialogModel()` with no arguments reproduces the default: white
"Loading Ad..." text under a looping circular Lottie spinner, on a
50%-dimmed background, not user-cancelable — visually the same default the
XML SDK ships.

### Customizing text, color, size

```kotlin
dialogModel = LoadingDialogModel(
    text = "Fetching your reward…",
    textColor = Color(0xFFFFC94D),
    textSize = 16.sp,
    backgroundDimAmount = 0.7f,
)
```

### Swapping the animation

`lottieRes` takes any raw Lottie JSON resource **in your own app's `res/raw`**
— the SDK only bundles its own default:

```kotlin
dialogModel = LoadingDialogModel(lottieRes = R.raw.my_custom_spinner, lottieSize = 96.dp)
```

Pass `lottieRes = null` to fall back to a plain Material3 `CircularProgressIndicator`
instead of a Lottie animation — useful if you'd rather not add a Lottie asset
of your own for one dialog.

### Full override — `content`

For anything the model's fields don't cover, replace the content entirely.
`backgroundDimAmount` and `cancelable` still apply — those govern the dialog
window itself, not what's inside it:

```kotlin
dialogModel = LoadingDialogModel(
    backgroundDimAmount = 0.6f,
    content = {
        Card(shape = RoundedCornerShape(16.dp)) {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(12.dp))
                Text("Hang tight…", style = MaterialTheme.typography.titleMedium)
            }
        }
    },
)
```

## Gotchas

- **`dialogModel` defaults to `LoadingDialogModel()` at the parameter level, not `null`** — passing `null` explicitly still falls back to `LoadingDialogModel()` inside the loader (`dialogModel ?: LoadingDialogModel()`), so there's no way to accidentally get an unstyled/blank dialog by passing `null`.
- Only one dialog is tracked at a time (a `WeakReference`, matching the XML SDK) — calling `show` while one is already up is a no-op, so overlapping ad requests on the same screen won't stack dialogs.
- `destroy()` on both `InterstitialAdLoader` and `RewardedAdLoader` hides any lingering dialog — call it when the user goes premium mid-load so a dialog doesn't get stuck on screen.
