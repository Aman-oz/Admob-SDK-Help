import {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import {CHANGE_TYPES, LATEST, RELEASES, formatReleaseDate} from '@site/src/data/releases';
import styles from './changelog.module.css';

function versionFromHash() {
  const wanted = window.location.hash.replace('#', '');
  return RELEASES.some((r) => r.version === wanted) ? wanted : null;
}

export default function Changelog() {
  const [selected, setSelected] = useState(LATEST.version);

  // Deep links like /changelog#2.0.4 (used by the home-page popup) pick the version.
  useEffect(() => {
    const sync = () => {
      const fromHash = versionFromHash();
      if (fromHash) setSelected(fromHash);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  function select(version) {
    setSelected(version);
    window.history.replaceState(null, '', `#${version}`);
  }

  const release = RELEASES.find((r) => r.version === selected) ?? LATEST;

  return (
    <Layout
      title="Release notes"
      description="Version history for the Ozi AdMob XML SDK (com.ozi.admob:ads) — what changed in each release.">
      <main className={styles.page}>
        <div className="container">
          <header className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Release notes</h1>
            <p className={styles.pageSubtitle}>
              XML SDK <code>com.ozi.admob:ads</code> — pick a version to see what changed. Listed from the SDK's
              tagged releases.
            </p>
          </header>

          <div className={styles.layout}>
            <nav className={styles.versions} aria-label="SDK versions">
              {RELEASES.map((r) => (
                <button
                  key={r.version}
                  type="button"
                  className={styles.versionButton}
                  aria-current={r.version === release.version ? 'true' : undefined}
                  onClick={() => select(r.version)}>
                  <span className={styles.versionNumber}>
                    {r.version}
                    {r.version === LATEST.version && <span className={styles.latestTag}>Latest</span>}
                  </span>
                  <span className={styles.versionDate}>{formatReleaseDate(r.date)}</span>
                </button>
              ))}
            </nav>

            <article className={styles.detail} aria-live="polite">
              <div className={styles.detailHeader}>
                <h2 className={styles.detailTitle}>
                  {release.version}
                  {release.version === LATEST.version && <span className={styles.latestTag}>Latest</span>}
                </h2>
                <p className={styles.detailMeta}>
                  {formatReleaseDate(release.date)} · Next-Gen SDK <code>{release.nextGen}</code> ·{' '}
                  <code>com.ozi.admob:ads:{release.version}</code>
                </p>
                <p className={styles.detailSummary}>{release.summary}</p>
              </div>

              <ul className={styles.changes}>
                {release.changes.map((change) => {
                  const type = CHANGE_TYPES[change.type];
                  return (
                    <li
                      key={change.title}
                      className={styles.change}
                      style={{'--chip-color': type.color, '--chip-bg': type.bg}}>
                      <span className={styles.chip}>{type.label}</span>
                      <div className={styles.changeBody}>
                        <strong>{change.title}</strong>
                        <span>{change.body}</span>
                        {change.to && (
                          <Link to={change.to} className={styles.changeLink}>
                            Read the docs →
                          </Link>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {release.headsUp && (
                <div className={styles.headsUp} role="note">
                  <strong>{release.headsUp.title}</strong>
                  <span>{release.headsUp.body}</span>
                  {release.headsUp.to && (
                    <Link to={release.headsUp.to} className={styles.changeLink}>
                      Details →
                    </Link>
                  )}
                </div>
              )}
            </article>
          </div>
        </div>
      </main>
    </Layout>
  );
}
