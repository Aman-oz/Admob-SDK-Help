import { useState } from 'react';
import Head from '@docusaurus/Head';
import BrowserOnly from '@docusaurus/BrowserOnly';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from '@site/src/lib/firebaseClient';
import styles from './login.module.css';

function LoginForm({ firebaseConfig }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const missingConfig = !firebaseConfig?.apiKey;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const auth = getFirebaseAuth(firebaseConfig);
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch('/api/session-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error('Session could not be created');

      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('redirect') || '/';
    } catch {
      setError('Incorrect email or password.');
      setLoading(false);
    }
  }

  if (missingConfig) {
    return (
      <div className={styles.card}>
        <p>
          Firebase isn't configured on this deployment yet — set{' '}
          <code>FIREBASE_API_KEY</code>, <code>FIREBASE_AUTH_DOMAIN</code>,{' '}
          <code>FIREBASE_PROJECT_ID</code>, and <code>FIREBASE_APP_ID</code> as
          environment variables in Vercel, then redeploy.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <h1 className={styles.title}>Sign in</h1>
      <p className={styles.subtitle}>Access is by invitation only — ask the site admin for an account.</p>
      <label className={styles.field}>
        <span>Email</span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && <p className={styles.error}>{error}</p>}
      <button className="button button--primary button--block" type="submit" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

// Deliberately does NOT use <Layout> — the site navbar links to protected
// pages, and Docusaurus navigates those client-side (no new HTTP request),
// which would let an unauthenticated visitor click straight past the login
// gate without ever hitting the server-side proxy check. A bare page with
// no in-app links closes that off.
export default function Login() {
  const {
    siteConfig: { customFields, title },
  } = useDocusaurusContext();

  return (
    <>
      <Head>
        <title>Sign in · {title}</title>
      </Head>
      <main className={styles.main}>
        <div className={styles.brand}>
          <img src="/img/logo.svg" alt="" className={styles.brandLogo} />
          <span>{title}</span>
        </div>
        <BrowserOnly fallback={<div className={styles.card} />}>
          {() => <LoginForm firebaseConfig={customFields.firebaseConfig} />}
        </BrowserOnly>
      </main>
    </>
  );
}
