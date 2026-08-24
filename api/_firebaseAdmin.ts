import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin, initialised once per serverless instance.
 *
 * Throws rather than falling back to Application Default Credentials: there is
 * no metadata server on Vercel, so the ADC path only ever produced a confusing
 * error deep inside an unrelated call.
 */
let cached: App | null = null;

export function adminApp(): App {
  if (cached) return cached;
  const existing = getApps();
  if (existing.length > 0) {
    cached = existing[0];
    return cached;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not configured');
  }
  cached = initializeApp({ credential: cert(typeof raw === 'string' ? JSON.parse(raw) : raw) });
  return cached;
}

export const adminAuth = (): Auth => getAuth(adminApp());
export const adminDb = (): Firestore => getFirestore(adminApp());
