import { apiFetch } from '../lib/apiClient';

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
  const response = await apiFetch('/api/send-telegram', {
    method: 'POST',
    body: JSON.stringify({ chatId, text })
  });
  if (!response.ok) {
    throw new Error(`Telegram relay failed with status ${response.status}`);
  }
};
