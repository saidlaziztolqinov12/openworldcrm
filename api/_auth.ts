import { adminAuth, adminDb } from './_firebaseAdmin';

export interface Caller {
  uid: string;
  email?: string;
  role: string;
}

/**
 * Verify the caller's Firebase ID token and load their profile.
 *
 * The role is read from `users/{uid}` on the server, never taken from the
 * request: a client-supplied role is just a claim by the client.
 */
export async function authenticate(req: any): Promise<Caller | null> {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (typeof header !== 'string' || !header.startsWith('Bearer ')) return null;

  try {
    const decoded = await adminAuth().verifyIdToken(header.slice(7).trim());
    const profile = await adminDb().collection('users').doc(decoded.uid).get();
    if (!profile.exists) return null;
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: (profile.data()?.role as string) || 'teacher'
    };
  } catch (error) {
    console.warn('Rejected a request with an invalid ID token:', error);
    return null;
  }
}

/** Verify the caller and require the admin role. Writes the response on failure. */
export async function requireAdmin(req: any, res: any): Promise<Caller | null> {
  const caller = await authenticate(req);
  if (!caller) {
    res.status(401).json({ error: 'Sign in required' });
    return null;
  }
  if (caller.role !== 'admin') {
    res.status(403).json({ error: 'Administrator access required' });
    return null;
  }
  return caller;
}
