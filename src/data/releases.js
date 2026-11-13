/**
 * XML SDK (com.ozi.admob:ads) release notes — the single source for both the
 * home-page "What's new" popup and the /changelog page.
 *
 * Add a new release at the TOP of RELEASES; the popup then reappears once for
 * everyone because it keys off the latest version string. Entries come from
 * the SDK repo's tagged releases (v2.0.1, v2.0.2, v2.0.4, v2.0.5, v2.1.2). Versions
 * that were never tagged are not listed on their own: 2.1.2 below covers everything
 * since v2.0.5, including the interim 2.1.0-rc1 and 2.1.1 builds.
 */

export const CHANGE_TYPES = {
  new: {label: 'New', color: 'var(--ozi-format-interstitial)', bg: 'var(--ozi-format-interstitial-bg)'},
  fix: {label: 'Fixed', color: 'var(--ozi-format-native)', bg: 'var(--ozi-format-native-bg)'},
  improved: {label: 'Improved', color: 'var(--ozi-format-banner)', bg: 'var(--ozi-format-banner-bg)'},
  dependency: {label: 'Dependency', color: 'var(--ozi-format-app-open)', bg: 'var(--ozi-format-app-open-bg)'},
};

export const RELEASES = [
  {
    version: '2.1.2',
    date: '2026-11-03',
    nextGen: '1.5.0',
    summary:
      'A one-call startup flow, in-app updates from Remote Config, journey-list navigation and banner caching. Covers everything since 2.0.5, including the interim 2.1.0-rc1 and 2.1.1 builds.',
    changes: [
      {
        type: 'new',
        title: 'Startup flow: one callback for Remote Config, update and consent',
        body:
          'ads.startup.start(...) fetches Remote Config, offers an in-app update and shows the consent form, with a time cap on every wait, then calls your app back. Pair it with setDeferAdsInit(true) and initializeAds().',
        to: '/xml-sdk/startup-flow',
      },
      {
        type: 'new',
        title: 'In-app updates, switched from Remote Config',
        body:
          'app_update_type 0 offers a flexible update, 1 an immediate one, anything else none. A background check for splash or main, a manual check with its own dialog for Settings, and customizable texts.',
        to: '/xml-sdk/app-update',
      },
      {
        type: 'improved',
        title: 'Consent never stops the ads flow',
        body:
          'Granted, declined, timed out or failed, the app carries on. The form load is capped, and a form that misses the cap is never shown late.',
        to: '/xml-sdk/startup-flow#consent-never-stops-the-ads-flow',
      },
      {
        type: 'new',
        title: 'Navigation is now a journey list',
        body:
          'app_navigation_configuration (config_version 2) lists the screens per launch type in order, with an optional ad before any step, a separate premium_offer screen and a default JSON asset. Moving Premium means moving it in the list.',
        to: '/xml-sdk/navigation-configuration',
      },
      {
        type: 'improved',
        title: 'Banners are cached for banner_ad_refresh_time',
        body:
          'A loaded banner is reused for 15 seconds by default (it used to be four hours). Tune it from Remote Config.',
        to: '/xml-sdk/ad-formats/banner#banner-caching',
      },
    ],
    headsUp: {
      title: 'Navigation reads a new Remote Config key',
      body:
        '2.1.x reads app_navigation_configuration, not navigation_configuration. Create the new parameter and add a default_navigation_configuration.json asset. Code that builds NavigationConfig with the old *_flow fields no longer compiles.',
      to: '/xml-sdk/overview#upgrading-from-205',
    },
  },
  {
    version: '2.0.5',
    date: '2026-10-12',
    nextGen: '1.5.0',
    summary: 'Three banner size types, the rewarded ad caching fix, and Next-Gen SDK 1.5.0.',
    changes: [
      {
        type: 'new',
        title: 'Three banner size types',
        body:
          'Adaptive and collapsible banners take a new adSizeType: LARGE_ANCHORED (the default, unchanged), ANCHORED_ADAPTIVE, or INLINE_ADAPTIVE with a max height. Pick per call site.',
        to: '/xml-sdk/ad-formats/banner#banner-size-types',
      },
      {
        type: 'fix',
        title: 'Rewarded ad caching fixed',
        body:
          'A rewarded ad is now requested once per ad unit. loadAd followed by loadAndShowAd shows the warm ad instead of fetching a second one, and a late-arriving ad is kept for the next call.',
        to: '/xml-sdk/ad-formats/rewarded#how-loading-and-caching-work',
      },
      {
        type: 'dependency',
        title: 'Next-Gen SDK 1.3.1 → 1.5.0',
        body:
          'The underlying ads-mobile-sdk moved up two minor versions. Re-run the runtime mediation adapter check once after upgrading.',
        to: '/xml-sdk/getting-started#picking-mediation-adapter-versions',
      },
    ],
    headsUp: {
      title: 'Java callers: banner methods changed shape',
      body:
        'Java code that passes an onAdLoaded listener to a banner method must now also pass adSizeType and inlineMaxHeightDp before it. Kotlin trailing-lambda calls are unaffected.',
      to: '/xml-sdk/ad-formats/banner#full-api',
    },
  },
  {
    version: '2.0.4',
    date: '2026-09-15',
    nextGen: '1.3.1',
    summary: 'Separate Get Started variants for first and second launch, and a resume ad preloading fix.',
    changes: [
      {
        type: 'new',
        title: 'Get Started variant per launch type',
        body:
          'The splash now has first_launch_get_started_variant and second_launch_get_started_variant, so a first-time and a returning user can see different splash screens.',
        to: '/xml-sdk/navigation-configuration',
      },
      {
        type: 'fix',
        title: 'Resume ad preloading fixed',
        body: 'Fixed an issue in how the resume ad is preloaded.',
        to: '/xml-sdk/ad-formats/app-open-resume',
      },
      {
        type: 'improved',
        title: 'Native ad label set from the builder',
        body: 'The "Ad" label on native ads is now controlled through NativeAdBuilder.',
        to: '/xml-sdk/ad-formats/native',
      },
    ],
    headsUp: {
      title: 'The single get_started_variant key is no longer read',
      body:
        'If your navigation_configuration JSON still uses get_started_variant, move it to the two new keys, or the splash falls back to variant 0 (direct, no button).',
      to: '/xml-sdk/navigation-configuration#sample-app_navigation_configuration-json',
    },
  },
  {
    version: '2.0.2',
    date: '2026-08-27',
    nextGen: '1.3.1',
    summary: 'Native ad video starts muted, and a background-thread crash is resolved.',
    changes: [
      {
        type: 'improved',
        title: 'Native ad video starts muted by default',
        body: 'Every native load/show method takes startVideoMuted, defaulting to true. Pass false where autoplaying sound is appropriate.',
        to: '/xml-sdk/ad-formats/native',
      },
      {
        type: 'fix',
        title: 'Background-thread crash resolved',
        body: 'Resolved a crash on a background thread.',
      },
    ],
  },
  {
    version: '2.0.1',
    date: '2026-08-20',
    nextGen: '1.3.1',
    summary: 'Interstitial loader optimized.',
    changes: [
      {
        type: 'improved',
        title: 'InterstitialAdLoader optimized',
        body: 'Internal optimizations to the interstitial loader.',
        to: '/xml-sdk/ad-formats/interstitial',
      },
    ],
  },
];

export const LATEST = RELEASES[0];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-10-12' → '12 Oct 2026'. Fixed formatting so SSR and client always agree. */
export function formatReleaseDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
