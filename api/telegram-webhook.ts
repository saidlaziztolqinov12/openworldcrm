import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

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

async function sendTelegramReply(token: string, chatId: number | string, text: string) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to send telegram reply:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({ status: "Telegram webhook endpoint is running" });
  }

  // Verify x-telegram-bot-api-secret-token header only if TELEGRAM_WEBHOOK_SECRET or TELEGRAM_SECRET_TOKEN is defined
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_SECRET_TOKEN;
  if (webhookSecret) {
    const secretToken = req.headers['x-telegram-bot-api-secret-token'];
    if (secretToken !== webhookSecret) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;
      const message = body?.message;

      if (!message) {
        return res.status(200).json({ ok: true });
      }

      const chatId = message.chat?.id;
      const text = message.text?.trim() || '';
      const token = process.env.TELEGRAM_BOT_TOKEN;

      if (!token) {
        console.error('Missing Telegram Bot Token');
        return res.status(200).json({ ok: true });
      }

      // Handle /start or message input
      const rawId = text.replace(/^\/start\s*/i, '').trim();
      const rawIdUpper = rawId.toUpperCase();
      const numericId = !isNaN(Number(rawId)) && rawId !== '' ? Number(rawId) : null;

      if (!rawId || text.toLowerCase() === '/start') {
        const greeting = "Assalomu alaykum! Open World xabarnoma botiga xush kelibsiz. 🎓\n\nFarzandingizning davomati va baholarini kuzatib borish uchun uning Talaba ID raqamini yuboring:\n\n(Masalan: 02030)";
        await sendTelegramReply(token, chatId, greeting);
        return res.status(200).json({ ok: true });
      }

      // Fetch students and groups from Firestore
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const groupsSnapshot = await getDocs(collection(db, 'groups'));

      const groupsMap = new Map<string, string>();
      groupsSnapshot.forEach((docSnap) => {
        const gData = docSnap.data();
        groupsMap.set(docSnap.id, gData.name || 'Guruh');
      });

      let matchedStudent: { id: string; name: string; groupName: string } | null = null;

      studentsSnapshot.forEach((docSnap) => {
        if (matchedStudent) return;
        const sData = docSnap.data();
        const docId = docSnap.id;
        const sStudentId = sData.studentId;
        const sCustomId = sData.customId;
        const sPhone = sData.phone ? String(sData.phone) : '';

        const matchDocId = docId.toUpperCase() === rawIdUpper;
        const matchStudentIdStr = sStudentId !== undefined && String(sStudentId).toUpperCase() === rawIdUpper;
        const matchStudentIdNum = numericId !== null && sStudentId === numericId;
        const matchCustomIdStr = sCustomId !== undefined && String(sCustomId).toUpperCase() === rawIdUpper;
        const matchCustomIdNum = numericId !== null && sCustomId === numericId;
        const matchPhone = sPhone === rawId || (numericId !== null && sPhone === String(numericId));

        if (matchDocId || matchStudentIdStr || matchStudentIdNum || matchCustomIdStr || matchCustomIdNum || matchPhone) {
          const studentName = `${sData.firstName || ''} ${sData.surname || ''}`.trim() || sData.name || "Talaba";
          const groupName = sData.groupId ? groupsMap.get(sData.groupId) || 'Biriktirilgan' : 'Biriktirilgan';
          matchedStudent = {
            id: docSnap.id,
            name: studentName,
            groupName
          };
        }
      });

      if (!matchedStudent) {
        const notFoundText = `❌ Bunday ID raqamli talaba topilmadi.\n\nIltimos, ID raqamini to'g'ri kiritganingizni tekshiring (masalan: 02030) yoki o'quv markazi ma'muriyatiga murojaat qiling.`;
        await sendTelegramReply(token, chatId, notFoundText);
      } else {
        const studentDocRef = doc(db, 'students', matchedStudent.id);
        const senderName = message.from?.first_name || '';
        const username = message.from?.username || '';

        await updateDoc(studentDocRef, {
          telegramChatId: chatId.toString(),
          parentTelegramId: chatId.toString(),
          telegramParentName: senderName,
          telegramUsername: username,
          telegramConnectedAt: new Date().toISOString()
        });

        const successText = `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n👤 <b>Talaba:</b> ${matchedStudent.name}\n🆔 <b>ID:</b> <code>${rawId}</code>\n\nFarzandingizning davomati va dars hisobotlari avtomatik ravishda ushbu botga yuboriladi.`;
        await sendTelegramReply(token, chatId, successText);
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Firestore lookup error:", error);
      const chatId = req.body?.message?.chat?.id;
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (chatId && token) {
        await sendTelegramReply(token, chatId, "⚠️ Xatolik yuz berdi. Iltimos, birozdan so'ng qayta urinib ko'ring yoki ma'muriyatga xabar bering.");
      }
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(200).json({ status: "Telegram webhook endpoint is running" });
}
