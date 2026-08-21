const { adminAuth, sessionCookieName } = require('../lib/firebaseAdmin.js');

// 5 days — Firebase's own cap on session cookies is 14 days.
const SESSION_EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { idToken } = req.body || {};
  if (!idToken) {
    res.status(400).json({ error: 'Missing idToken' });
    return;
  }

  try {
    // checkRevoked=true rejects tokens for accounts that were just disabled/deleted.
    await adminAuth().verifyIdToken(idToken, true);
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    res.setHeader(
      'Set-Cookie',
      `${sessionCookieName()}=${sessionCookie}; Max-Age=${Math.floor(SESSION_EXPIRES_IN_MS / 1000)}; Path=/; HttpOnly; Secure; SameSite=Lax`
    );
    res.status(200).json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid or expired credentials' });
  }
};
