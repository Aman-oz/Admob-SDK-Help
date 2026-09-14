import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import Reveal from '@site/src/components/Reveal';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import SdkChooser from '@site/src/components/SdkChooser';
import styles from './index.module.css';

function HomepageHeader() {
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
        </Reveal>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={siteConfig.title}
      description="Internal integration reference for the Ozi AdMob Next-Gen SDK — ads and remote config, for both the XML/View SDK and the Jetpack Compose SDK.">
      <HomepageHeader />
      <main>
        <SdkChooser />
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
