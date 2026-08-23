import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

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

const BOT_TOKEN = process.env.VITE_TELEGRAM_BOT_TOKEN || '8729008792:AAHQe2GrZRdx97O-sxNrJtiW02vXaTgN_H4';

async function sendTelegramReply(chatId: number | string, text: string) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
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
    const update = req.body;
    if (!update || !update.message) {
      return res.status(200).json({ status: "ok" });
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text ? message.text.trim() : "";

    if (!text) {
      return res.status(200).json({ status: "ok" });
    }

    if (text.startsWith("/start")) {
      const greeting = "Assalomu alaykum! <b>Open World Academy</b> tizimiga xush kelibsiz.\n\nFarzandingizning davomatini kuzatib borish uchun o'quv markazimizga taqdim etgan <b>telefon raqamingizni</b> yuboring:\n\n<i>(Masalan: +998901234567 yoki 901234567)</i>";
      await sendTelegramReply(chatId, greeting);
      return res.status(200).json({ status: "ok" });
    }

    // Check if message contains digits
    const digitsOnly = text.replace(/\D/g, "");
    if (digitsOnly.length < 5) {
      return res.status(200).json({ status: "ok" });
    }

    const last9 = digitsOnly.slice(-9);

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
      if (pPhoneDigits.endsWith(last9)) {
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
      await sendTelegramReply(chatId, notFoundText);
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
      await sendTelegramReply(chatId, successText);
    }

    return res.status(200).json({ status: "ok" });
  } catch (err) {
    console.error("Error processing telegram webhook:", err);
    return res.status(200).json({ status: "ok" }); // Always respond with HTTP 200 OK to Telegram
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Telegram webhook endpoints
  app.post("/api/telegram-webhook", handleTelegramWebhookLogic);
  app.post("/api/telegram-webhook.js", handleTelegramWebhookLogic);

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
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
