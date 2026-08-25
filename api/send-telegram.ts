import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { chat_id, text, parse_mode } = req.body || {};
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.error('TELEGRAM_BOT_TOKEN is not configured');
      return res.status(500).json({ error: 'Telegram bot token not configured' });
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

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('Error in /api/send-telegram:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
