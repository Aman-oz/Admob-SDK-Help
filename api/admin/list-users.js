const { adminAuth, verifySessionFromCookieHeader } = require('../../lib/firebaseAdmin.js');

// Any logged-in user can see the roster — only create/delete are admin-only.
module.exports = async function handler(req, res) {
  const decoded = await verifySessionFromCookieHeader(req.headers.cookie);
  if (!decoded) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const result = await adminAuth().listUsers(1000);
    const users = result.users
      .map((u) => ({
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || null,
        creationTime: u.metadata.creationTime,
        disabled: u.disabled,
      }))
      .sort((a, b) => new Date(a.creationTime) - new Date(b.creationTime));
    res.status(200).json({ users });
  } catch {
    res.status(500).json({ error: 'Failed to list users' });
  }
};
