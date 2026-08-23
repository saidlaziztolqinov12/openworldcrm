import type { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

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

    const fcmServerKey = process.env.FCM_SERVER_KEY || 'YOUR_FIREBASE_SERVER_KEY';
    
    // Attempt sending via Firebase Cloud Messaging HTTP v1 or legacy API if key exists, otherwise log successfully
    let fcmResult = { success: true, message: 'Simulated FCM push sent' };
    if (fcmServerKey && fcmServerKey !== 'YOUR_FIREBASE_SERVER_KEY') {
      const response = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${fcmServerKey}`
        },
        body: JSON.stringify({
          to: targetToken,
          notification: {
            title: title || 'New Notification',
            body: body || '',
            sound: 'default'
          },
          priority: 'high',
          data: data || {}
        })
      });
      fcmResult = await response.json();
    } else {
      console.log('FCM Push Dispatched (No FCM_SERVER_KEY configured, simulated dispatch):', {
        to: targetToken,
        title,
        body,
        data
      });
    }

    return res.status(200).json({ success: true, result: fcmResult, token: targetToken });
  } catch (error: any) {
    console.error('Error in /api/send-push:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
