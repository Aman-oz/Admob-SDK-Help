import Link from '@docusaurus/Link';
import Reveal from '@site/src/components/Reveal';
import styles from './styles.module.css';

const TRACKS = [
  {
    key: 'xml',
    title: 'XML / View-based SDK',
    coordinate: 'com.ozi.admob:ads',
    description:
      'The original SDK for Activity/Fragment + XML-layout apps. Ad loaders, a config-driven splash → onboarding → main navigation layer, and Remote Config-resolved placements.',
    bullets: ['AdMobManager facade over the Next-Gen GMA SDK', 'Navigation Configuration (splash/onboarding/premium flows)', 'XML native ad layouts'],
    to: '/xml-sdk/overview',
    cta: 'View XML SDK docs',
    color: 'var(--ozi-format-banner)',
    bg: 'var(--ozi-format-banner-bg)',
  },
  {
    key: 'compose',
    title: 'Jetpack Compose SDK',
    coordinate: 'com.ozi.admob.nextgen.compose:ads',
    description:
      'The same placement-and-point model, rebuilt for Compose apps: banner and native are Composables, and a Compose-hosted loading dialog replaces the XML LoadingDialog.',
    bullets: ['BannerAd() / NativeAd() / NativeAdCard() Composables', 'Coroutine-based loaders (suspend, no Handler)', 'Compose-driven LoadingDialog with a full content override'],
    to: '/compose-sdk/overview',
    cta: 'View Compose SDK docs',
    color: 'var(--ozi-format-native)',
    bg: 'var(--ozi-format-native-bg)',
  },
];

export default function SdkChooser() {
  return (
    <section className={styles.section}>
      <div className="container">
        <Reveal as="div" className={styles.headingWrap}>
          <h2 className={styles.heading}>Which SDK are you integrating?</h2>
          <p className={styles.subheading}>
            Same placement keys and Remote Config JSON behind both — pick the one that matches your app's UI toolkit.
          </p>
        </Reveal>
        <div className={styles.grid}>
          {TRACKS.map((track, i) => (
            <Reveal key={track.key} delay={i * 100}>
              <Link to={track.to} className={styles.card} style={{'--card-color': track.color, '--card-bg': track.bg}}>
                <span className={styles.badge}>{track.title}</span>
                <code className={styles.coordinate}>{track.coordinate}</code>
                <p className={styles.description}>{track.description}</p>
                <ul className={styles.bullets}>
                  {track.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
                <span className={styles.cta}>{track.cta} →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
