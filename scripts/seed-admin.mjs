/**
 * One-off: create the first administrator account.
 *
 * Passwords used to live as literals in src/lib/seedData.ts, which
 * AuthContext imports — so `admin123` and `teacher123` shipped inside the
 * public JavaScript bundle, readable by anyone. The app also used to seed
 * itself from any visitor's browser. Both are gone; account creation is now a
 * deliberate, local action.
 *
 * Usage (tsx, because this imports firebase.config.ts):
 *   ADMIN_EMAIL=director@example.uz ADMIN_PASSWORD='<a strong password>' \
 *     npm run seed:admin
 *
 * NOTE: this writes the password as a plain Firestore field, because the app
 * still authenticates in the client. That is a stopgap. Migrating to Firebase
 * Authentication is the required next step — see README, "Security status".
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase.config.ts';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME || 'Administrator';

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD, then re-run.');
  process.exit(1);
}
if (password.length < 12) {
  console.error('Choose a password of at least 12 characters.');
  process.exit(1);
}

const db = getFirestore(initializeApp(firebaseConfig));
const ref = doc(db, 'users', 'admin-1');

if ((await getDoc(ref)).exists()) {
  console.error('users/admin-1 already exists. Delete it first if you meant to reset it.');
  process.exit(1);
}

const [firstName, ...rest] = name.split(' ');
await setDoc(ref, {
  id: 'admin-1',
  name,
  firstName,
  surname: rest.join(' '),
  email: email.toLowerCase(),
  password,
  role: 'admin',
  phone: '',
  title: 'Director',
  subject: '',
  avatarColor: 'bg-indigo-600',
  createdAt: new Date().toISOString()
});

console.log(`Created users/admin-1 for ${email}.`);
process.exit(0);
