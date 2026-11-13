import {useCallback, useEffect, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Reveal from '@site/src/components/Reveal';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import SdkChooser from '@site/src/components/SdkChooser';
import WhatsNewModal from '@site/src/components/WhatsNewModal';
import {LATEST} from '@site/src/data/releases';
import styles from './index.module.css';

const SEEN_KEY = 'ozi-whatsnew-seen';

// Per-viewer convenience only: storage can be blocked or empty, so every
// access is guarded and the page works the same without it.
function readSeen() {
  try {
    return window.localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(version) {
  try {
    window.localStorage.setItem(SEEN_KEY, version);
  } catch {
    // ignore — the popup simply shows again next visit
  }
}

function HomepageHeader({onOpenWhatsNew}) {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className={styles.heroGlowOne} />
      <div className={styles.heroGlowTwo} />
      <div className={clsx('container', styles.heroContent)}>
        <Reveal>
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Internal documentation · Next-Gen line
          </span>
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
        </Reveal>
        <Reveal delay={120}>
          <div className={styles.buttons}>
            <Link className="button button--secondary button--lg" to="/xml-sdk/overview">
              XML SDK docs
            </Link>
            <Link className="button button--outline button--lg" to="/compose-sdk/overview">
              Compose SDK docs
            </Link>
          </div>
          <div className={styles.releaseRow}>
            <button type="button" className={styles.releasePill} onClick={onOpenWhatsNew}>
              <span className={styles.releaseNew}>New</span>
              XML SDK {LATEST.version} — see what changed
            </button>
            <Link to="/changelog" className={styles.releaseLink}>
              All versions →
            </Link>
          </div>
        </Reveal>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // Auto-open once per release; reappears only when a newer version is added.
  useEffect(() => {
    if (readSeen() === LATEST.version) return undefined;
    const timer = setTimeout(() => setShowWhatsNew(true), 700);
    return () => clearTimeout(timer);
  }, []);

  const closeWhatsNew = useCallback(() => {
    writeSeen(LATEST.version);
    setShowWhatsNew(false);
  }, []);

  return (
    <Layout
      title={siteConfig.title}
      description="Internal integration reference for the Ozi AdMob Next-Gen SDK — ads and remote config, for both the XML/View SDK and the Jetpack Compose SDK.">
      <HomepageHeader onOpenWhatsNew={() => setShowWhatsNew(true)} />
      <WhatsNewModal open={showWhatsNew} onClose={closeWhatsNew} release={LATEST} />
      <main>
        <SdkChooser />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
