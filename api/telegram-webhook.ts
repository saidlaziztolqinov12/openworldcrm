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
      const inputId = text.replace('/start', '').trim().toUpperCase();

      if (!inputId || text === '/start') {
        const greeting = "Assalomu alaykum! Open World Academy xabarnoma botiga xush kelibsiz. 🎓\n\nFarzandingizning davomati va baholarini kuzatib borish uchun uning <b>Talaba ID</b> raqamini yuboring:\n\n(Masalan: <code>ST-101</code> yoki <code>OW-1004</code>)";
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
        const sDocId = docSnap.id.toUpperCase();
        const sStudentId = (sData.studentId || '').toUpperCase();
        const sCustomId = (sData.customId || '').toUpperCase();

        if (sDocId === inputId || sStudentId === inputId || sCustomId === inputId) {
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
        const notFoundText = "❌ <b>Bunday ID raqamli talaba topilmadi.</b>\n\nIltimos, ID raqamini to'g'ri kiritganingizni tekshiring (masalan: <code>ST-101</code>) yoki o'quv markazi ma'muriyatiga murojaat qiling.";
        await sendTelegramReply(token, chatId, notFoundText);
      } else {
        const studentDocRef = doc(db, 'students', matchedStudent.id);
        await updateDoc(studentDocRef, {
          telegramChatId: chatId.toString(),
          parentTelegramId: chatId.toString(),
          telegramParentName: message.from?.first_name || '',
          telegramUsername: message.from?.username || '',
          telegramConnectedAt: new Date().toISOString()
        });

        const successText = `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n👤 <b>Talaba:</b> ${matchedStudent.name}\n📚 <b>Guruh:</b> ${matchedStudent.groupName}\n\nEndi davomat belgilanganda (kelmadi, kechikdi) va to'lov hisobotlari avtomatik ravishda ushbu chatga yuboriladi.`;
        await sendTelegramReply(token, chatId, successText);
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Webhook error:', err);
      return res.status(200).json({ ok: true });
    }
  }

  return res.status(200).json({ status: "Telegram webhook endpoint is running" });
}
