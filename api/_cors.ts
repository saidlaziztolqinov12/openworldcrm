/**
 * Shared CORS handling for the API routes.
 *
 * ALLOWED_ORIGIN is a comma-separated list, because the same deployment is
 * called from more than one origin: the web app on its own domain, and the
 * Capacitor build, whose WebView reports `https://localhost` on Android and
 * `capacitor://localhost` on iOS. Configuring only the public domain silently
 * blocked every request from the mobile app.
 *
 * Returns true when the request was a preflight and has been answered.
 */
export function applyCors(req: any, res: any): boolean {
  const allowed = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const origin = req.headers?.origin;

  if (allowed.length > 0 && origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
