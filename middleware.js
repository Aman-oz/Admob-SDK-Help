const { next } = require('@vercel/functions');
const { verifySessionFromCookieHeader } = require('./lib/firebaseAdmin.js');

// Requires a valid Firebase session cookie on every route except the ones
// listed below. Runs on the Node.js runtime (not Edge) because firebase-admin
// needs Node's crypto APIs.
const config = {
  runtime: 'nodejs',
  matcher: ['/((?!api|assets|img|login|favicon\\.ico|favicon\\.svg|sitemap\\.xml).*)'],
};

async function middleware(request) {
  const decoded = await verifySessionFromCookieHeader(request.headers.get('cookie'));
  if (decoded) return next();

  const url = new URL('/login', request.url);
  url.searchParams.set('redirect', new URL(request.url).pathname);
  return Response.redirect(url, 302);
}

module.exports = middleware;
module.exports.config = config;
