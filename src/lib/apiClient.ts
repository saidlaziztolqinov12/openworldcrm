import { auth } from './firebase';
import { apiUrl } from './apiBase';

/**
 * fetch() against this app's own API with the caller's Firebase ID token
 * attached. The server verifies the token and reads the role from Firestore,
 * so nothing here is trusted.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const token = await user.getIdToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(apiUrl(path), { ...init, headers });
}

/** As apiFetch, but throws a useful Error when the server rejects the call. */
export async function apiJson<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(path, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((payload as { error?: string })?.error || `Request failed (${response.status})`);
  }
  return payload as T;
}
