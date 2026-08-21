const { verifySessionFromCookieHeader, isAdminEmail } = require('../lib/firebaseAdmin.js');

module.exports = async function handler(req, res) {
  const decoded = await verifySessionFromCookieHeader(req.headers.cookie);
  if (!decoded) {
    res.status(401).json({ authenticated: false });
    return;
  }
  res.status(200).json({
    authenticated: true,
    uid: decoded.uid,
    email: decoded.email,
    isAdmin: isAdminEmail(decoded.email),
  });
};
