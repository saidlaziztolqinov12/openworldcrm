export const sendTelegramMessage = async (chatId: string | number, text: string) => {
  if (!chatId) return;
  const token = (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN || '8729008792:AAHQe2GrZRdx97O-sxNrJtiW02vXaTgN_H4';
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
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
};
