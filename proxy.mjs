import { next } from '@vercel/functions';
import firebaseAdmin from './lib/firebaseAdmin.js';

// Requires a valid Firebase session cookie on every route except the ones
// excluded by vercel.json's proxy.matcher. Runs on the Node.js runtime
// (the default for proxy-configured entrypoints) because firebase-admin
// needs Node's crypto APIs — it would not work on the Edge runtime.
export default async function proxy(request) {
  const decoded = await firebaseAdmin.verifySessionFromCookieHeader(request.headers.get('cookie'));
  if (decoded) return next();

  const url = new URL('/login', request.url);
  url.searchParams.set('redirect', new URL(request.url).pathname);
  return Response.redirect(url, 302);
}
