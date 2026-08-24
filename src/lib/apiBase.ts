/**
 * Absolute base URL for this app's own API routes.
 *
 * A relative `/api/...` fetch works in the browser but not inside the
 * Capacitor APK: there the origin is `https://localhost`, served from the
 * bundled `dist/` folder, which contains no `api/` directory — so every
 * relative call 404s before it ever reaches the server.
 *
 * Set VITE_API_BASE_URL to the deployed origin (e.g. https://crm.example.uz)
 * for native builds. On the web it can stay empty and requests stay same-origin.
 */
const configured = ((import.meta as any).env?.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const apiUrl = (path: string): string => {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  if (configured) return `${configured}${suffix}`;
  return suffix;
};
