import Link from '@docusaurus/Link';
import Reveal from '@site/src/components/Reveal';
import styles from './styles.module.css';

const FORMATS = [
  {
    key: 'app-open',
    title: 'App Open & Resume',
    blurb: 'Cold start & background return',
    to: '/ad-formats/app-open-resume',
    color: 'var(--ozi-format-app-open)',
    bg: 'var(--ozi-format-app-open-bg)',
    icon: (
      <>
        <path d="M4 24h24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M9 24a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="16" y1="8" x2="16" y2="4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="8" y1="12" x2="5.5" y2="9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="24" y1="12" x2="26.5" y2="9.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </>
    ),
  },
  {
    key: 'interstitial',
    title: 'Interstitial',
    blurb: 'Full-screen, between content',
    to: '/ad-formats/interstitial',
    color: 'var(--ozi-format-interstitial)',
    bg: 'var(--ozi-format-interstitial-bg)',
    icon: (
      <>
        <path d="M4 10V4h6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 10V4h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 22v6h6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M28 22v6h-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="13" y="13" width="6" height="6" rx="1.2" fill="currentColor" />
      </>
    ),
  },
  {
    key: 'rewarded',
    title: 'Rewarded',
    blurb: 'Opt-in video for a reward',
    to: '/ad-formats/rewarded',
    color: 'var(--ozi-format-rewarded)',
    bg: 'var(--ozi-format-rewarded-bg)',
    icon: (
      <>
        <circle cx="16" cy="16" r="11" fill="currentColor" />
        <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="700" fill="#fff">$</text>
      </>
    ),
  },
  {
    key: 'banner',
    title: 'Banner',
    blurb: 'Persistent, anchored to screen',
    to: '/ad-formats/banner',
    color: 'var(--ozi-format-banner)',
    bg: 'var(--ozi-format-banner-bg)',
    icon: (
      <>
        <rect x="4" y="3" width="24" height="26" rx="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <rect x="7.5" y="20.5" width="17" height="5.5" rx="1.4" fill="currentColor" />
      </>
    ),
  },
  {
    key: 'native',
    title: 'Native',
    blurb: 'Styled to match your layout',
    to: '/ad-formats/native',
    color: 'var(--ozi-format-native)',
    bg: 'var(--ozi-format-native-bg)',
    icon: (
      <>
        <rect x="4" y="5" width="24" height="6" rx="1.6" fill="currentColor" opacity="0.35" />
        <rect x="4" y="13" width="24" height="6" rx="1.6" fill="currentColor" />
        <rect x="4" y="21" width="24" height="6" rx="1.6" fill="currentColor" opacity="0.35" />
      </>
    ),
  },
];

export default function AdFormatGrid() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Reveal as="div" className={styles.headingWrap}>
          <h2 className={styles.heading}>Five formats, one API</h2>
          <p className={styles.subheading}>
            Every format is reached through the same <code>AdMobManager</code> singleton and resolved by placement key — pick one to see its exact methods.
          </p>
        </Reveal>
        <div className={styles.grid}>
          {FORMATS.map((f, i) => (
            <Reveal key={f.key} delay={i * 70}>
              <Link to={f.to} className={styles.card}>
                <span className={styles.iconBadge} style={{background: f.bg, color: f.color}}>
                  <svg viewBox="0 0 32 32" className={styles.cardIcon}>{f.icon}</svg>
                </span>
                <span className={styles.cardTitle}>{f.title}</span>
                <span className={styles.cardBlurb}>{f.blurb}</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
