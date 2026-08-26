import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyClabMv0UKAy6FIak8RCqbneRsjkVmQrxk",
  authDomain: "open-world-platform.firebaseapp.com",
  projectId: "open-world-platform",
  storageBucket: "open-world-platform.firebasestorage.app",
  messagingSenderId: "619360434283",
  appId: "1:619360434283:web:df5c43f0104efff7e1192e"
};

const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase);

if (!getAdminApps().length) {
  try {
    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      initAdminApp({
        credential: cert(serviceAccount)
      });
    } else {
      initAdminApp({
        projectId: 'open-world-platform'
      });
    }
  } catch (e) {
    console.warn('Firebase Admin init warning in server.ts:', e);
  }
}

async function sendTelegramReply(token: string, chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
  } catch (err) {
    console.error('Failed to send telegram reply:', err);
  }
}

async function handleTelegramWebhookLogic(req: any, res: any) {
  try {
    // Verify x-telegram-bot-api-secret-token header
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (!process.env.TELEGRAM_WEBHOOK_SECRET || secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const update = req.body;
    if (!update || !update.message) {
      return res.status(200).json({ status: "ok" });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text ? message.text.trim() : "";
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error("Missing TELEGRAM_BOT_TOKEN");
      return res.status(200).json({ status: "ok" });
    }

    if (!text) {
      return res.status(200).json({ status: "ok" });
    }

    if (text.startsWith("/start")) {
      const greeting = "Assalomu alaykum! <b>Open World Academy</b> tizimiga xush kelibsiz.\n\nFarzandingizning davomatini kuzatib borish uchun o'quv markazimizga taqdim etgan <b>telefon raqamingizni</b> yuboring:\n\n<i>(Masalan: +998901234567 yoki 901234567)</i>";
      await sendTelegramReply(token, chatId, greeting);
      return res.status(200).json({ status: "ok" });
    }

    // Check if message contains digits & exact phone matching
    const digitsOnly = text.replace(/\D/g, "");
    if (digitsOnly.length < 5) {
      return res.status(200).json({ status: "ok" });
    }

    // Fetch all students and groups from Firestore
    const studentsSnapshot = await getDocs(collection(db, "students"));
    const groupsSnapshot = await getDocs(collection(db, "groups"));

    const groupsMap = new Map<string, string>();
    groupsSnapshot.forEach((docSnap) => {
      const gData = docSnap.data();
      groupsMap.set(docSnap.id, gData.name || "Guruh");
    });

    const matchedStudents: Array<{ id: string; name: string; groupName: string }> = [];

    studentsSnapshot.forEach((docSnap) => {
      const sData = docSnap.data();
      const pPhone = (sData.parentPhone || sData.phone || "").toString();
      const pPhoneDigits = pPhone.replace(/\D/g, "");
      
      // Exact phone number matching
      if (pPhoneDigits && pPhoneDigits === digitsOnly) {
        const studentName = `${sData.firstName || ''} ${sData.surname || ''}`.trim() || "O'quvchi";
        const groupName = sData.groupId ? groupsMap.get(sData.groupId) || "Guruh" : "Guruhsiz";
        matchedStudents.push({
          id: docSnap.id,
          name: studentName,
          groupName
        });
      }
    });

    if (matchedStudents.length === 0) {
      const notFoundText = "❌ Ushbu telefon raqami tizimda topilmadi.\n\nIltimos, raqamni to'g'ri kiritganingizni tekshirib qayta yuboring yoki administratorga murojaat qiling.";
      await sendTelegramReply(token, chatId, notFoundText);
    } else {
      // Update all matched student documents with telegramChatId
      for (const student of matchedStudents) {
        const studentDocRef = doc(db, "students", student.id);
        await updateDoc(studentDocRef, {
          telegramChatId: chatId,
          parentTelegramId: chatId
        });
      }

      const studentNamesList = matchedStudents.map(s => `• <b>${s.name}</b> (${s.groupName})`).join('\n');
      const successText = `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n👤 <b>O'quvchi(lar):</b>\n${studentNamesList}\n\nEndi dars davomati va o'qituvchi izohlari muntazam ravishda sizga yuborib turiladi.`;
      await sendTelegramReply(token, chatId, successText);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Error processing telegram webhook:", err);
    return res.status(200).json({ status: "ok" });
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side Telegram Relay endpoint
  app.post("/api/send-telegram", async (req, res) => {
    try {
      const { chat_id, text, parse_mode } = req.body || {};
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) {
        return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not configured' });
      }
      if (!chat_id || !text) {
        return res.status(400).json({ error: 'Missing chat_id or text' });
      }
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id,
          text,
          parse_mode: parse_mode || 'HTML'
        })
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.json({ success: true, data });
    } catch (err: any) {
      console.error("Error in /api/send-telegram:", err);
      res.status(500).json({ error: err.message || "Failed to send telegram message" });
    }
  });

  // Telegram webhook endpoints
  app.post("/api/telegram-webhook", handleTelegramWebhookLogic);
  app.post("/api/telegram-webhook.js", handleTelegramWebhookLogic);

  // Send Push Notification endpoint with secured CORS and no sensitive tokens in response
  app.post("/api/send-push", async (req, res) => {
    const origin = req.headers.origin;
    if (origin && (origin.includes('run.app') || origin.includes('localhost') || origin.includes('ai.studio'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'https://ais-dev-g3246sj4v3smwahqwra5jh-1047176565098.asia-southeast1.run.app');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!rawKey) {
        return res.status(500).json({
          success: false,
          error: 'FIREBASE_SERVICE_ACCOUNT environment variable is unconfigured. Please configure Firebase Admin credentials.'
        });
      }

      const { recipientUserId, token, fcmToken, title, body, data } = req.body || {};

      if (recipientUserId === 'GLOBAL' || recipientUserId === 'all' || recipientUserId === 'all_users') {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const tokens: string[] = [];
        usersSnapshot.forEach((docSnap) => {
          const uData = docSnap.data();
          if (uData.fcmToken && typeof uData.fcmToken === 'string' && uData.fcmToken.trim() !== '') {
            tokens.push(uData.fcmToken);
          }
        });

        if (tokens.length === 0) {
          return res.status(200).json({ success: true, message: 'No active device tokens found for global push broadcast.' });
        }

        const messaging = getMessaging();
        for (let i = 0; i < tokens.length; i += 500) {
          const batchTokens = tokens.slice(i, i + 500);
          await messaging.sendEachForMulticast({
            tokens: batchTokens,
            notification: {
              title: title || 'New Broadcast Announcement',
              body: body || ''
            },
            data: data ? Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])) : {},
            android: {
              priority: 'high',
              notification: { sound: 'default', channelId: 'default' }
            }
          });
        }
        return res.status(200).json({ success: true, count: tokens.length });
      }

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
        return res.status(400).json({ error: "Missing fcmToken or recipientUserId" });
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

      try {
        await getMessaging().send(message);
      } catch (err: any) {
        console.warn('Admin messaging send failed in server.ts:', err);
        throw err;
      }

      // Return { success: true } only, without sensitive device tokens
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in /api/send-push:", err);
      res.status(500).json({ success: false, error: err.message || "Failed to send push notification" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
