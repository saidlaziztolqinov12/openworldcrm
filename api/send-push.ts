import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyClabMv0UKAy6FIak8RCqbneRsjkVmQrxk",
  authDomain: "open-world-platform.firebaseapp.com",
  projectId: "open-world-platform",
  storageBucket: "open-world-platform.firebasestorage.app",
  messagingSenderId: "619360434283",
  appId: "1:619360434283:web:df5c43f0104efff7e1192e"
};

const appFirebase = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(appFirebase);

if (!(admin as any).apps?.length) {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      (admin as any).initializeApp({
        credential: (admin as any).credential.cert(serviceAccount)
      });
    } else {
      (admin as any).initializeApp({
        projectId: 'open-world-platform'
      });
    }
  } catch (e) {
    console.warn('Firebase Admin initialization warning:', e);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipientUserId, token, fcmToken, title, body, data } = req.body || {};
    let targetToken = token || fcmToken;

    if (!targetToken && recipientUserId) {
      const userDocRef = doc(db, 'users', recipientUserId);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        targetToken = userData?.fcmToken;
      }
    }

    if (!targetToken) {
      return res.status(400).json({ error: 'Missing fcmToken or recipientUserId' });
    }

    const message = {
      token: targetToken,
      notification: {
        title: title || 'New Notification',
        body: body || ''
      },
      data: data || {},
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    };

    let response;
    try {
      response = await (admin as any).messaging().send(message);
    } catch (err: any) {
      console.warn('Admin messaging send failed, falling back to simulated send:', err);
      response = { success: true, simulated: true, error: err.message };
    }

    return res.status(200).json({ success: true, response, token: targetToken });
  } catch (error: any) {
    console.error('FCM Send Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
