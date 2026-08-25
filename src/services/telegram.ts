export const escapeHtml = (str: string): string => {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

export const sendTelegramMessage = async (chatId: string | number, text: string) => {
  if (!chatId) return;
  try {
    const response = await fetch('/api/send-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    if (!response.ok) {
      throw new Error(`Failed to send telegram message: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
  }
};
