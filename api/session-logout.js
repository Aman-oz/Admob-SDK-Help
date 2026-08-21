const { sessionCookieName } = require('../lib/firebaseAdmin.js');

module.exports = function handler(req, res) {
  res.setHeader(
    'Set-Cookie',
    `${sessionCookieName()}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`
  );
  res.status(200).json({ ok: true });
};
