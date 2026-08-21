import React from 'react';
import styles from './styles.module.css';

const ACCENTS = {
  'app-open': 'var(--ozi-format-app-open)',
  interstitial: 'var(--ozi-format-interstitial)',
  rewarded: 'var(--ozi-format-rewarded)',
  banner: 'var(--ozi-format-banner)',
  native: 'var(--ozi-format-native)',
};

function PhoneFrame({children, clipId}) {
  return (
    <svg viewBox="0 0 160 320" className={styles.phone} role="img" aria-hidden="true">
      <rect x="2" y="2" width="156" height="316" rx="26" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <rect x="56" y="10" width="48" height="8" rx="4" fill="currentColor" opacity="0.25" />
      <clipPath id={clipId}>
        <rect x="10" y="26" width="140" height="284" rx="14" />
      </clipPath>
      <rect x="10" y="26" width="140" height="284" rx="14" className={styles.screen} />
      <g clipPath={`url(#${clipId})`}>{children}</g>
    </svg>
  );
}

function ContentRows({count = 4, y = 40}) {
  return Array.from({length: count}).map((_, i) => (
    <rect
      key={i}
      x="22"
      y={y + i * 20}
      width={i % 2 === 0 ? 116 : 90}
      height="10"
      rx="5"
      fill="currentColor"
      opacity="0.12"
    />
  ));
}

function AppOpenArt() {
  return (
    <>
      <ContentRows count={3} y={40} />
      <rect x="50" y="150" width="60" height="60" rx="14" fill={ACCENTS['app-open']} opacity="0.15" />
      <rect x="65" y="165" width="30" height="30" rx="8" fill={ACCENTS['app-open']} />
      <g className={styles.appOpenSun}>
        <circle cx="80" cy="240" r="18" fill={ACCENTS['app-open']} />
      </g>
      {[-40, 0, 40].map((dx, i) => (
        <line
          key={i}
          className={styles.appOpenRay}
          x1={80 + dx * 0.6}
          y1="270"
          x2={80 + dx}
          y2="300"
          stroke={ACCENTS['app-open']}
          strokeWidth="4"
          strokeLinecap="round"
        />
      ))}
    </>
  );
}

function InterstitialArt() {
  return (
    <>
      <ContentRows count={6} y={36} />
      <g className={styles.interstitialPanel}>
        <rect x="16" y="60" width="128" height="200" rx="16" fill={ACCENTS.interstitial} opacity="0.12" />
        <rect x="16" y="60" width="128" height="200" rx="16" fill="none" stroke={ACCENTS.interstitial} strokeWidth="2" />
        <rect x="46" y="90" width="68" height="68" rx="10" fill={ACCENTS.interstitial} opacity="0.35" />
        <rect x="40" y="180" width="80" height="10" rx="5" fill={ACCENTS.interstitial} opacity="0.5" />
        <rect x="52" y="200" width="56" height="10" rx="5" fill={ACCENTS.interstitial} opacity="0.3" />
      </g>
      <g className={styles.interstitialClose}>
        <circle cx="128" cy="72" r="10" fill="currentColor" opacity="0.15" />
        <line x1="124" y1="68" x2="132" y2="76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="132" y1="68" x2="124" y2="76" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
    </>
  );
}

function RewardedArt() {
  return (
    <>
      <ContentRows count={2} y={36} />
      <rect x="40" y="90" width="80" height="80" rx="12" fill={ACCENTS.rewarded} opacity="0.12" />
      <polygon points="70,120 70,140 96,130" fill={ACCENTS.rewarded} />
      <g className={styles.rewardedCoin}>
        <circle cx="80" cy="210" r="26" fill={ACCENTS.rewarded} />
        <circle cx="80" cy="210" r="18" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
        <text x="80" y="216" textAnchor="middle" fontSize="16" fontWeight="700" fill="#fff">$</text>
      </g>
      {[[40, 190], [120, 195], [50, 245], [112, 240]].map(([x, y], i) => (
        <circle key={i} className={styles.rewardedSpark} cx={x} cy={y} r="3" fill={ACCENTS.rewarded} />
      ))}
    </>
  );
}

function BannerArt() {
  return (
    <>
      <ContentRows count={9} y={34} />
      <g className={styles.bannerBar}>
        <rect x="10" y="264" width="140" height="46" rx="8" fill={ACCENTS.banner} opacity="0.15" />
        <rect x="10" y="264" width="140" height="46" rx="8" fill="none" stroke={ACCENTS.banner} strokeWidth="2" />
        <rect x="20" y="278" width="18" height="18" rx="4" fill={ACCENTS.banner} opacity="0.5" />
        <rect x="46" y="276" width="60" height="8" rx="4" fill={ACCENTS.banner} opacity="0.5" />
        <rect x="46" y="290" width="40" height="6" rx="3" fill={ACCENTS.banner} opacity="0.3" />
        <rect x="118" y="280" width="22" height="14" rx="4" fill={ACCENTS.banner} opacity="0.35" />
      </g>
    </>
  );
}

function NativeArt() {
  return (
    <>
      {[0, 1, 2].map((row) => {
        const y = 36 + row * 84;
        const isAd = row === 1;
        return (
          <g key={row}>
            <rect
              className={isAd ? styles.nativeCard : undefined}
              x="16"
              y={y}
              width="128"
              height="70"
              rx="10"
              fill={isAd ? ACCENTS.native : 'currentColor'}
              fillOpacity={isAd ? 0.1 : 0.06}
              stroke={isAd ? ACCENTS.native : 'none'}
              strokeWidth={isAd ? 2 : 0}
            />
            <rect x="26" y={y + 10} width="40" height="40" rx="8" fill="currentColor" opacity="0.15" />
            <rect x="76" y={y + 14} width="58" height="8" rx="4" fill="currentColor" opacity="0.25" />
            <rect x="76" y={y + 28} width="42" height="6" rx="3" fill="currentColor" opacity="0.15" />
            {isAd && (
              <rect x="76" y={y + 44} width="26" height="12" rx="4" fill={ACCENTS.native} opacity="0.7" />
            )}
          </g>
        );
      })}
    </>
  );
}

const ART = {
  'app-open': AppOpenArt,
  interstitial: InterstitialArt,
  rewarded: RewardedArt,
  banner: BannerArt,
  native: NativeArt,
};

/**
 * Animated phone-mockup hero used at the top of each ad-format doc page.
 * `format` selects the illustration; `title`/`description` render as copy
 * next to it. Pass MDX children for anything extra (e.g. a "when to use"
 * callout) below the description.
 */
export default function AdFormatHero({format, title, description, children}) {
  const Art = ART[format];
  if (!Art) {
    throw new Error(`AdFormatHero: unknown format "${format}"`);
  }
  return (
    <div className="ozi-format-hero" style={{color: ACCENTS[format]}}>
      <div className="ozi-format-hero__phone">
        <PhoneFrame clipId={`ozi-screen-clip--${format}`}>
          <Art />
        </PhoneFrame>
      </div>
      <div className="ozi-format-hero__copy">
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
      </div>
    </div>
  );
}
