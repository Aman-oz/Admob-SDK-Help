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

  const { uid } = req.body || {};
  if (!uid) {
    res.status(400).json({ error: 'Missing uid' });
    return;
  }
  if (uid === decoded.uid) {
    res.status(400).json({ error: "You can't remove your own account" });
    return;
  }

  try {
    await adminAuth().deleteUser(uid);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to remove user' });
  }
};
