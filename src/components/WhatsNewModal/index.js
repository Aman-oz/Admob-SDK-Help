import {useEffect, useRef} from 'react';
import Link from '@docusaurus/Link';
import {CHANGE_TYPES, formatReleaseDate} from '@site/src/data/releases';
import styles from './styles.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function WhatsNewModal({open, onClose, release}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = dialogRef.current.querySelectorAll(FOCUSABLE);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title">
        <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>

        <div className={styles.header}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} />
            New release
          </span>
          <h2 id="whats-new-title" className={styles.title}>
            XML SDK {release.version} is out
          </h2>
          <p className={styles.meta}>
            {formatReleaseDate(release.date)} · <code>com.ozi.admob:ads:{release.version}</code> · Next-Gen{' '}
            <code>{release.nextGen}</code>
          </p>
        </div>

        <ul className={styles.list}>
          {release.changes.map((change) => {
            const type = CHANGE_TYPES[change.type];
            return (
              <li key={change.title} className={styles.item} style={{'--chip-color': type.color, '--chip-bg': type.bg}}>
                <span className={styles.chip}>{type.label}</span>
                <div className={styles.itemBody}>
                  <strong className={styles.itemTitle}>{change.title}</strong>
                  <span className={styles.itemText}>{change.body}</span>
                  {change.to && (
                    <Link to={change.to} className={styles.itemLink} onClick={onClose}>
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
          </div>
        )}

        <div className={styles.actions}>
          <Link to={`/changelog#${release.version}`} className={styles.secondary} onClick={onClose}>
            All versions &amp; release notes
          </Link>
          <button type="button" className={styles.primary} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
