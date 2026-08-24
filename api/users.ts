import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_cors';
import { requireAdmin } from './_auth';
import { adminAuth, adminDb } from './_firebaseAdmin';

/**
 * Staff account management. Admin only.
 *
 * Creating a Firebase Auth user has to happen server-side:
 * createUserWithEmailAndPassword on the client would sign the administrator
 * out and into the account they just created.
 *
 * The Firestore profile is keyed by the Auth UID so that firestore.rules can
 * read the caller's own role with get(/databases/$(db)/documents/users/$(request.auth.uid)).
 * Passwords are never stored in Firestore — Firebase Auth owns them.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  const caller = await requireAdmin(req, res);
  if (!caller) return;

  try {
    if (req.method === 'POST') return await createStaff(req, res);
    if (req.method === 'DELETE') return await deleteStaff(req, res, caller.uid);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    // Surface the useful Firebase Auth errors rather than a blanket 500.
    if (error?.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'That email address already has an account' });
    }
    if (error?.code === 'auth/invalid-password') {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (error?.code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'That email address is not valid' });
    }
    console.error('Staff account operation failed:', error);
    return res.status(500).json({ error: 'Could not complete the request' });
  }
}

async function createStaff(req: VercelRequest, res: VercelResponse) {
  const { email, password, profile } = req.body || {};
  if (typeof email !== 'string' || !email.trim()) {
    return res.status(400).json({ error: 'email is required' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const record = await adminAuth().createUser({
    email: email.trim().toLowerCase(),
    password,
    displayName: profile?.name || undefined
  });

  const doc = {
    ...(profile || {}),
    id: record.uid,
    email: record.email,
    role: 'teacher',
    createdAt: new Date().toISOString()
  };
  // password is deliberately absent.
  delete (doc as Record<string, unknown>).password;

  await adminDb().collection('users').doc(record.uid).set(doc);
  return res.status(201).json({ uid: record.uid, user: doc });
}

async function deleteStaff(req: VercelRequest, res: VercelResponse, callerUid: string) {
  const uid = (req.query?.uid as string) || req.body?.uid;
  if (typeof uid !== 'string' || !uid) {
    return res.status(400).json({ error: 'uid is required' });
  }
  if (uid === callerUid) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  // Remove the sign-in credential first: a leftover Auth user with no profile
  // can still authenticate, whereas a leftover profile cannot.
  try {
    await adminAuth().deleteUser(uid);
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') throw error;
  }
  await adminDb().collection('users').doc(uid).delete();
  return res.status(200).json({ ok: true });
}
