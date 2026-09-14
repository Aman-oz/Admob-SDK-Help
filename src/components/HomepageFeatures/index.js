import Heading from '@theme/Heading';
import Reveal from '@site/src/components/Reveal';
import styles from './styles.module.css';

function GaugeIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.icon}>
      <path d="M8 40a24 24 0 1 1 48 0" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="32" y1="40" x2="44" y2="26" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="32" cy="40" r="4" fill="currentColor" />
    </svg>
  );
}

function BlockIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.icon}>
      <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="4" />
      <line x1="17" y1="47" x2="47" y2="17" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg viewBox="0 0 64 64" className={styles.icon}>
      <polygon points="32,10 56,22 32,34 8,22" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <polyline points="8,34 32,46 56,34" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="8,46 32,58 56,46" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const FeatureList = [
  {
    title: 'Remote Config driven',
    Icon: GaugeIcon,
    description:
      'Ad unit IDs and pacing live in one Firebase Remote Config JSON parameter. Change a value in the console and every app picks it up on its next fetch — no release needed.',
  },
  {
    title: 'Per-point ad blocking',
    Icon: BlockIcon,
    description:
      'A placement can be blocked at specific call sites via a "points" block-list in Remote Config, without touching the shared ad unit ID everywhere else it\'s used. Works the same way in both SDKs.',
  },
  {
    title: 'One API per track',
    Icon: LayersIcon,
    description:
      'Method names and placement keys are consistent across every app on the same SDK track — XML or Compose — so patterns learned on one project transfer directly to the next.',
  },
];

function Feature({Icon, title, description, delay}) {
  return (
    <Reveal className="col col--4" delay={delay}>
      <div className="text--center">
        <Icon />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </Reveal>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} delay={idx * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
