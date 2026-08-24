import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Server-side relay for parent notifications.
 *
 * The bot token is read from server env only. It must NOT be exposed under a
 * VITE_ prefix: Vite inlines those into the browser bundle, and a leaked bot
 * token lets anyone call setWebhook and capture every message parents send.
 */
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

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
