import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp as initClientApp, getApps as getClientApps } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyClabMv0UKAy6FIak8RCqbneRsjkVmQrxk",
  authDomain: "open-world-platform.firebaseapp.com",
  projectId: "open-world-platform",
  storageBucket: "open-world-platform.firebasestorage.app",
  messagingSenderId: "619360434283",
  appId: "1:619360434283:web:df5c43f0104efff7e1192e"
};

const clientApp = getClientApps().length === 0 ? initClientApp(firebaseConfig) : getClientApps()[0];
const db = getFirestore(clientApp);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

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

    // Initialize Firebase Admin once
    if (!getApps().length) {
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!rawKey) {
        console.error('FIREBASE_SERVICE_ACCOUNT is not configured; push notifications are disabled');
        return res.status(500).json({ success: false, error: 'Push notifications are not configured' });
      }
      const serviceAccount = typeof rawKey === 'string' ? JSON.parse(rawKey) : rawKey;
      initializeApp({ credential: cert(serviceAccount) });
    }

    // Send Real Push via FCM v1
    const message = {
      token: targetToken,
      notification: {
        title: title || 'New Request Received',
        body: body || ''
      },
      data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'default',
          channelId: 'default'
        }
      }
    };

    const response = await getMessaging().send(message);
    return res.status(200).json({ success: true, messageId: response });
  } catch (error: any) {
    console.error('FCM Dispatch Failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
