import { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './team.module.css';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}

function AddUserForm({ onCreated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add teammate');
      setEmail('');
      setPassword('');
      setDisplayName('');
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.addForm} onSubmit={handleSubmit}>
      <h3>Add a teammate</h3>
      <div className={styles.addFormRow}>
        <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="text"
          placeholder="Name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          type="password"
          placeholder="Temporary password (8+ chars)"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="button button--primary" type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );
}

function TeamPanel() {
  const [me, setMe] = useState(null);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);

  async function loadMe() {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();
      if (!res.ok || !data.authenticated) {
        window.location.href = '/login?redirect=/team';
        return null;
      }
      setMe(data);
      return data;
    } catch {
      window.location.href = '/login?redirect=/team';
      return null;
    }
  }

  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/list-users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load team list');
      setUsers(data.users);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadMe().then((info) => {
      if (info) loadUsers();
    });
  }, []);

  async function handleRemove(uid) {
    if (!window.confirm('Remove this person\'s access?')) return;
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove user');
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleLogout() {
    await fetch('/api/session-logout', { method: 'POST' });
    window.location.href = '/login';
  }

  if (!me) return <p>Loading…</p>;

  return (
    <div className={styles.wrapper}>
      <div className={styles.headerRow}>
        <div>
          <h1>Team Access</h1>
          <p className={styles.you}>
            Signed in as <strong>{me.email}</strong> {me.isAdmin && <span className={styles.adminBadge}>Admin</span>}
          </p>
        </div>
        <button className="button button--secondary" onClick={handleLogout}>
          Log out
        </button>
      </div>

      {me.isAdmin && <AddUserForm onCreated={loadUsers} />}

      {error && <p className={styles.error}>{error}</p>}

      {!users ? (
        <p>Loading team list…</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Added</th>
              {me.isAdmin && <th />}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uid}>
                <td>{u.displayName || '—'}</td>
                <td>{u.email}</td>
                <td>{formatDate(u.creationTime)}</td>
                {me.isAdmin && (
                  <td>
                    {u.uid !== me.uid && (
                      <button className={styles.removeBtn} onClick={() => handleRemove(u.uid)}>
                        Remove
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Team() {
  return (
    <Layout title="Team Access" description="Who has access to the Ozi AdMob SDK docs">
      <main className={styles.main}>
        <BrowserOnly fallback={<p>Loading…</p>}>{() => <TeamPanel />}</BrowserOnly>
      </main>
    </Layout>
  );
}
