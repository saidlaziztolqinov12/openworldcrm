import { apiUrl } from '../lib/apiBase';

/**
 * Escape text destined for Telegram's parse_mode: 'HTML'.
 * Student names and free-text teacher comments are interpolated into the
 * message; an unescaped '<' made Telegram reject the whole send, so the parent
 * silently received nothing.
 */
export const escapeTelegramHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Send a Telegram message through this app's own API route.
 *
 * The bot token deliberately never reaches the client. Sending directly from
 * the browser required a VITE_-prefixed token, which Vite inlines into the
 * production bundle — anyone could read it and call setWebhook to hijack every
 * parent notification. The token now lives only in server-side env.
 */
export const sendTelegramMessage = async (chatId: string | number, text: string): Promise<void> => {
  if (!chatId) return;
  const response = await fetch(apiUrl('/api/send-telegram'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, text })
  });
  if (!response.ok) {
    throw new Error(`Telegram relay failed with status ${response.status}`);
  }
};
