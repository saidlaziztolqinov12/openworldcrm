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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS / pre-flight handling
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Explicitly handle Telegram POST updates
  if (req.method === 'POST') {
    try {
      const body = req.body;
      const message = body?.message;

      if (!message) {
        return res.status(200).json({ ok: true });
      }

      const chatId = message.chat?.id;
      const text = message.text?.trim() || '';
      const token = process.env.VITE_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '8729008792:AAHQe2GrZRdx97O-sxNrJtiW02vXaTgN_H4';

      if (!token) {
        console.error('Missing Telegram Bot Token');
        return res.status(200).json({ ok: true });
      }

      // Handle /start
      if (text.startsWith('/start')) {
        const greeting = "Assalomu alaykum! <b>Open World Academy</b> tizimiga xush kelibsiz.\n\nFarzandingizning davomatini kuzatib borish uchun o'quv markazimizga taqdim etgan <b>telefon raqamingizni</b> yuboring:\n\n<i>(Masalan: +998901234567 yoki 901234567)</i>";
        await sendTelegramReply(token, chatId, greeting);
        return res.status(200).json({ ok: true });
      }

      // Phone Number extraction & matching
      const digitsOnly = text.replace(/\D/g, '');
      if (digitsOnly.length < 5) {
        return res.status(200).json({ ok: true });
      }

      const last9 = digitsOnly.slice(-9);

      // Fetch students and groups from Firestore
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const groupsSnapshot = await getDocs(collection(db, 'groups'));

      const groupsMap = new Map<string, string>();
      groupsSnapshot.forEach((docSnap) => {
        const gData = docSnap.data();
        groupsMap.set(docSnap.id, gData.name || 'Guruh');
      });

      const matchedStudents: Array<{ id: string; name: string; groupName: string }> = [];

      studentsSnapshot.forEach((docSnap) => {
        const sData = docSnap.data();
        const pPhone = (sData.parentPhone || sData.phone || '').toString();
        const pPhoneDigits = pPhone.replace(/\D/g, '');
        if (pPhoneDigits && pPhoneDigits.endsWith(last9)) {
          const studentName = `${sData.firstName || ''} ${sData.surname || ''}`.trim() || "O'quvchi";
          const groupName = sData.groupId ? groupsMap.get(sData.groupId) || 'Guruh' : 'Guruhsiz';
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
        // Update all matched students with telegramChatId
        for (const student of matchedStudents) {
          const studentDocRef = doc(db, 'students', student.id);
          await updateDoc(studentDocRef, {
            telegramChatId: chatId,
            parentTelegramId: chatId
          });
        }

        const studentNamesList = matchedStudents.map((s) => `• <b>${s.name}</b> (${s.groupName})`).join('\n');
        const successText = `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n👤 <b>O'quvchi(lar):</b>\n${studentNamesList}\n\nEndi dars davomati va o'qituvchi izohlari muntazam ravishda sizga yuborib turiladi.`;
        await sendTelegramReply(token, chatId, successText);
      }

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Webhook error:', err);
      return res.status(200).json({ ok: true });
    }
  }

  // For GET/health checks
  return res.status(200).send('Telegram Webhook is running');
}
