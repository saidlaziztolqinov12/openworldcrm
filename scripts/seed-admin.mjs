/**
 * One-off: create the first administrator.
 *
 * This is the only account that cannot be made from inside the app, because
 * creating staff requires an admin to already exist. It uses the Admin SDK, so
 * it needs the same FIREBASE_SERVICE_ACCOUNT the API routes use.
 *
 * Usage:
 *   ADMIN_EMAIL=director@example.uz ADMIN_PASSWORD='<a strong password>' \
 *     ADMIN_NAME='Firstname Lastname' npm run seed:admin
 *
 * Idempotent: if the email already has an Auth account, its profile document
 * is created or promoted rather than failing.
 */
import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || 'Administrator';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!email || !password) fail('Set ADMIN_EMAIL and ADMIN_PASSWORD, then re-run.');
if (password.length < 12) fail('Choose a password of at least 12 characters.');

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) {
  fail(
    'FIREBASE_SERVICE_ACCOUNT is not set.\n' +
      'Firebase Console -> Project settings -> Service accounts -> Generate new private key,\n' +
      'then put the JSON on a single line in .env.'
  );
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(JSON.parse(raw)) });
}
const auth = getAuth();
const db = getFirestore();

let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`Auth account already exists for ${email} (${user.uid}); updating its password.`);
  await auth.updateUser(user.uid, { password, displayName: name });
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error;
  user = await auth.createUser({ email, password, displayName: name });
  console.log(`Created Auth account for ${email} (${user.uid}).`);
}

// The profile document is keyed by the Auth UID: firestore.rules reads
// users/{request.auth.uid} to decide what this person may do.
const [firstName, ...rest] = name.split(' ');
const ref = db.collection('users').doc(user.uid);
const existing = await ref.get();

await ref.set(
  {
    id: user.uid,
    name,
    firstName,
    surname: rest.join(' '),
    email,
    role: 'admin',
    phone: existing.data()?.phone || '',
    title: existing.data()?.title || 'Director',
    subject: existing.data()?.subject || '',
    avatarColor: existing.data()?.avatarColor || 'bg-indigo-600',
    createdAt: existing.data()?.createdAt || new Date().toISOString()
  },
  { merge: true }
);

console.log(`users/${user.uid} is now an administrator. You can sign in as ${email}.`);
process.exit(0);
