const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

function app() {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, ' +
        'and FIREBASE_PRIVATE_KEY in your Vercel project environment variables.'
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

function adminAuth() {
  return getAuth(app());
}

function isAdminEmail(email) {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

const SESSION_COOKIE_NAME = 'session';

function sessionCookieName() {
  return SESSION_COOKIE_NAME;
}

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  });
  return out;
}

/**
 * Verifies the session cookie from a raw Cookie header string.
 * Returns the decoded token (with .email/.uid) or null if absent/invalid.
 */
async function verifySessionFromCookieHeader(cookieHeader) {
  const cookie = parseCookies(cookieHeader)[SESSION_COOKIE_NAME];
  if (!cookie) return null;
  try {
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

module.exports = {
  adminAuth,
  isAdminEmail,
  sessionCookieName,
  verifySessionFromCookieHeader,
};
