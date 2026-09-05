import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    console.error("FIREBASE_SERVICE_ACCOUNT_KEY is missing in environment variables!");
  } else {
    try {
      const serviceAccount = JSON.parse(rawKey);
      if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
    }
  }
}
const db = getFirestore();

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

      if (!token || !chatId) {
        console.error('Missing Telegram Bot Token or Chat ID');
        return res.status(200).json({ ok: true });
      }

      const securityRef = db.collection('telegram_security').doc(chatId.toString());
      const securityDoc = await securityRef.get();
      const securityData = securityDoc.exists ? securityDoc.data() || {} : {};

      // 1. Rate Limiting & Cooldown Check (`telegram_security/{chatId}`)
      if (securityData.lockedUntil) {
        const lockedUntilDate = new Date(securityData.lockedUntil);
        if (lockedUntilDate > new Date()) {
          const remainingMin = Math.ceil((lockedUntilDate.getTime() - Date.now()) / 60000);
          await sendTelegramReply(
            token,
            chatId,
            `⚠️ <b>Xavfsizlik bloki:</b> Noto'g'ri urinishlar ko'p bo'lgani uchun vaqtincha bloklandingiz.\n\nQolgan vaqt: <b>${remainingMin} daqiqa</b>. Iltimos, keyinroq urinib ko'ring.`
          );
          return res.status(200).json({ ok: true });
        } else {
          // Cooldown expired, reset security state
          await securityRef.set({ failedAttempts: 0, lockedUntil: null, pendingStudentId: null, stage: null }, { merge: true });
          securityData.failedAttempts = 0;
          securityData.lockedUntil = null;
        }
      }

      // Handle /start or reset
      if (text.toLowerCase() === '/start' || text.toLowerCase() === 'start') {
        await securityRef.set({ pendingStudentId: null, stage: null }, { merge: true });
        const greeting = "Assalomu alaykum! Open World xabarnoma botiga xush kelibsiz. 🎓\n\nFarzandingizning davomati va baholarini kuzatib borish uchun uning Talaba ID raqamini yuboring:\n\n(Masalan: 02030)";
        await sendTelegramReply(token, chatId, greeting);
        return res.status(200).json({ ok: true });
      }

      // Check max connection limit (Max 3 Students)
      const existingLinkedSnap = await db.collection('students').where('telegramChatId', '==', chatId.toString()).get();
      const linkedCount = existingLinkedSnap.size;

      const stage = securityData.stage;
      const pendingStudentId = securityData.pendingStudentId;

      // 3. Two-Step Parent Phone Verification (Two-Factor Pairing) - Stage AWAITING_PHONE_VERIFICATION
      if (stage === 'AWAITING_PHONE_VERIFICATION' && pendingStudentId) {
        const cleanInput = text.replace(/\D/g, '');
        const studentDocRef = db.collection('students').doc(pendingStudentId);
        const studentDoc = await studentDocRef.get();

        if (!studentDoc.exists) {
          await securityRef.set({ pendingStudentId: null, stage: null }, { merge: true });
          await sendTelegramReply(token, chatId, "❌ Talaba topilmadi. Iltimos, qaytadan ID raqamini yuboring.");
          return res.status(200).json({ ok: true });
        }

        const sData = studentDoc.data() || {};
        const sPhone = sData.parentPhone ? String(sData.parentPhone) : (sData.phone ? String(sData.phone) : '');
        const cleanStudentPhone = sPhone.replace(/\D/g, '');

        const isMatch = cleanInput.length >= 4 && cleanStudentPhone.endsWith(cleanInput);

        if (isMatch) {
          // Check if already linked to this chat
          const isAlreadyLinked = sData.telegramChatId === chatId.toString();
          if (!isAlreadyLinked && linkedCount >= 3) {
            await securityRef.set({ pendingStudentId: null, stage: null }, { merge: true });
            await sendTelegramReply(
              token,
              chatId,
              "⚠️ <b>Limit tugadi:</b> Bitta Telegram hisobiga ko'pi bilan 3 ta talabani ulash mumkin. Agar boshqa farzandingizni ulamoqchi bo'lsangiz, avval o'quv markaz ma'muriyati bilan bog'lanib eskilarini uzdiring."
            );
            return res.status(200).json({ ok: true });
          }

          const senderName = message.from?.first_name || '';
          const username = message.from?.username || '';
          const studentName = `${sData.firstName || ''} ${sData.surname || ''}`.trim() || sData.name || "Talaba";

          await studentDocRef.update({
            telegramChatId: chatId.toString(),
            parentTelegramId: chatId.toString(),
            telegramParentName: senderName,
            telegramUsername: username,
            telegramConnectedAt: new Date().toISOString()
          });

          // Reset failed attempts & remove security locks upon successful link
          await securityRef.set({
            failedAttempts: 0,
            lockedUntil: null,
            pendingStudentId: null,
            stage: null
          }, { merge: true });

          const successText = `✅ <b>Muvaffaqiyatli ulandi!</b>\n\n👤 <b>Talaba:</b> ${studentName}\n\nFarzandingizning davomati va dars hisobotlari avtomatik ravishda ushbu botga yuboriladi.`;
          await sendTelegramReply(token, chatId, successText);
        } else {
          // Failed verification attempt
          const currentAttempts = (securityData.failedAttempts || 0) + 1;
          let updateData: any = { failedAttempts: currentAttempts };

          if (currentAttempts >= 3) {
            updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            updateData.pendingStudentId = null;
            updateData.stage = null;
            await securityRef.set(updateData, { merge: true });
            await sendTelegramReply(
              token,
              chatId,
              "❌ Telefon raqam mos kelmadi. Noto'g'ri urinishlar soni 3 tadan oshdi. Xavfsizlik maqsadida 15 daqiqaga bloklandingiz."
            );
          } else {
            await securityRef.set(updateData, { merge: true });
            await sendTelegramReply(
              token,
              chatId,
              "❌ Telefon raqam mos kelmadi. Qayta urinib ko'ring."
            );
          }
        }

        return res.status(200).json({ ok: true });
      }

      // Check max connection limit before allowing new search
      if (linkedCount >= 3) {
        await sendTelegramReply(
          token,
          chatId,
          "⚠️ <b>Limit tugadi:</b> Bitta Telegram hisobiga ko'pi bilan 3 ta talabani ulash mumkin. Agar boshqa farzandingizni ulamoqchi bo'lsangiz, avval o'quv markaz ma'muriyati bilan bog'lanib eskilarini uzdiring."
        );
        return res.status(200).json({ ok: true });
      }

      // Normal stage: User sent ID or phone to search student
      const rawId = text.trim();
      const rawIdUpper = rawId.toUpperCase();
      const numericId = !isNaN(Number(rawId)) && rawId !== '' ? Number(rawId) : null;

      const studentsSnapshot = await db.collection('students').get();
      let matchedStudentDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      let matchedStudentData: any = null;

      studentsSnapshot.forEach((docSnap) => {
        if (matchedStudentDoc) return;
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
          matchedStudentDoc = docSnap;
          matchedStudentData = sData;
        }
      });

      if (!matchedStudentDoc) {
        const currentAttempts = (securityData.failedAttempts || 0) + 1;
        let updateData: any = { failedAttempts: currentAttempts };

        if (currentAttempts >= 3) {
          updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await securityRef.set(updateData, { merge: true });
          await sendTelegramReply(
            token,
            chatId,
            "❌ Bunday ID raqamli talaba topilmadi. Noto'g'ri urinishlar soni 3 tadan oshdi. Xavfsizlik maqsadida 15 daqiqaga bloklandingiz."
          );
        } else {
          await securityRef.set(updateData, { merge: true });
          await sendTelegramReply(
            token,
            chatId,
            `❌ Bunday ID raqamli talaba topilmadi. Iltimos, ID raqamini to'g'ri kiritganingizni tekshiring (Urinishlar: ${currentAttempts}/3).`
          );
        }
      } else {
        // Student found -> DO NOT link immediately. Save state in telegram_security/{chatId}
        const studentName = `${matchedStudentData.firstName || ''} ${matchedStudentData.surname || ''}`.trim() || matchedStudentData.name || "Talaba";

        await securityRef.set({
          pendingStudentId: (matchedStudentDoc as any).id,
          stage: 'AWAITING_PHONE_VERIFICATION',
          failedAttempts: securityData.failedAttempts || 0
        }, { merge: true });

        const promptText = `👤 <b>Talaba topildi:</b> ${studentName}\n\nXavfsizlikni ta'minlash uchun talabaning tizimda ro'yxatdan o'tgan <b>telefon raqamining oxirgi 4 ta raqamini</b> yuboring:`;
        await sendTelegramReply(token, chatId, promptText);
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("Telegram webhook error:", error);
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
