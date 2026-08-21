const { adminAuth, verifySessionFromCookieHeader, isAdminEmail } = require('../../lib/firebaseAdmin.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const decoded = await verifySessionFromCookieHeader(req.headers.cookie);
  if (!decoded || !isAdminEmail(decoded.email)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  const { email, password, displayName } = req.body || {};
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const user = await adminAuth().createUser({
      email,
      password,
      displayName: displayName || undefined,
    });
    res.status(200).json({ ok: true, uid: user.uid });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
};
