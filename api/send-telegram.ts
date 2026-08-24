import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { firebaseConfig } from '../src/firebase.config';

/**
 * Server-side relay for parent notifications.
 *
 * The bot token is read from server env only. It must NOT be exposed under a
 * VITE_ prefix: Vite inlines those into the browser bundle, and a leaked bot
 * token lets anyone call setWebhook and capture every message parents send.
 */
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

/**
 * The app has no server-side session yet, so this route cannot authenticate its
 * caller. It is therefore restricted to chats that a parent has already linked
 * to a student: the bot can only message families it is already talking to, and
 * cannot be used to send arbitrary text to arbitrary Telegram users.
 *
 * Replace this with a real identity check once Firebase Auth is in place.
 */
async function isLinkedParentChat(chatId: string | number): Promise<boolean> {
  const asNumber = typeof chatId === 'string' ? Number(chatId) : chatId;
  const candidates = Number.isFinite(asNumber) ? [asNumber, String(chatId)] : [String(chatId)];
  for (const field of ['telegramChatId', 'parentTelegramId']) {
    for (const value of candidates) {
      const snapshot = await getDocs(
        query(collection(db, 'students'), where(field, '==', value), limit(1))
      );
      if (!snapshot.empty) return true;
    }
  }
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not configured');
    return res.status(500).json({ error: 'Telegram is not configured on the server' });
  }

  const { chatId, text } = req.body || {};
  if (!chatId || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'chatId and text are required' });
  }
  if (text.length > 4096) {
    return res.status(400).json({ error: 'text exceeds the Telegram 4096 character limit' });
  }

  try {
    if (!(await isLinkedParentChat(chatId))) {
      console.warn('Refused a send to a chat that is not linked to any student:', chatId);
      return res.status(403).json({ error: 'This chat is not linked to a student' });
    }

    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
    });
    const payload = await tgResponse.json();
    if (!tgResponse.ok || !payload?.ok) {
      // Surface the failure instead of pretending the parent was notified.
      console.error('Telegram sendMessage failed:', payload?.description);
      return res.status(502).json({ error: 'Telegram rejected the message' });
    }
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Telegram relay error:', error);
    return res.status(502).json({ error: 'Could not reach Telegram' });
  }
}
