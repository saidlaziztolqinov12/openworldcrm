/**
 * Cross-platform SMS URI Generator
 * Supports international formats including Uzbekistan (+998...)
 * Correctly encodes messages and uses appropriate query separator for iOS & Android
 */
export const createSmsUri = (phoneNumber: string, message: string = ''): string => {
  if (!phoneNumber) return '#';

  // Extract digits and preserve leading + if present
  let cleanNumber = phoneNumber.trim().replace(/[^\d+]/g, '');
  if (!cleanNumber.startsWith('+')) {
    if (cleanNumber.startsWith('998')) {
      cleanNumber = `+${cleanNumber}`;
    } else {
      cleanNumber = `+998${cleanNumber}`;
    }
  }

  // Check iOS user agent for optimal query separator
  const isIOS =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent || '');

  // RFC standard / modern platforms use ?body= while legacy iOS used &body=
  const separator = isIOS ? '&body=' : '?body=';

  if (!message) {
    return `sms:${cleanNumber}`;
  }

  return `sms:${cleanNumber}${separator}${encodeURIComponent(message)}`;
};

const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * The Telegram relay sends with parse_mode: 'HTML'. Student names and the
 * teacher's free-text comment are interpolated here, so an unescaped '<'
 * (e.g. "progress < target") made Telegram reject the entire message and the
 * parent silently received nothing.
 */
export const formatAttendanceNotification = (
  studentName: string,
  dateStr: string,
  status: string,
  score?: string | number,
  note?: string
): string => {
  const uzMonths = [
    'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
    'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
  ];
  const uzDays = [
    'yakshanba', 'dushanba', 'seshanba', 'chorshanba',
    'payshanba', 'juma', 'shanba'
  ];

  let year = new Date().getFullYear();
  let monthIdx = 0;
  let dayNum = 1;

  if (dateStr && dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      dayNum = parseInt(parts[2], 10);
    }
  }

  const d = new Date(year, monthIdx, dayNum);
  const dayOfWeek = uzDays[d.getDay()] || 'dushanba';
  const monthName = uzMonths[monthIdx] || 'avgust';
  const formattedDate = `${dayNum}-${monthName} ${year}`;

  const statusBadge =
    status === 'present' ? "✅ Darsga keldi" :
    status === 'late' ? "⚠️ Kechikib keldi" :
    "❌ Darsga kelmadi";

  const lines: string[] = [
    "🔔 Open World — O'quvchi hisoboti",
    "",
    `Student: ${escapeHtml(studentName)}`,
    `Sana: ${formattedDate} (${dayOfWeek})`,
    `Holati: ${statusBadge}`
  ];

  if (score !== undefined && score !== null && String(score).trim() !== '') {
    lines.push(`Ball: ${score}`);
  }

  if (note && note.trim() !== '') {
    lines.push(`Izoh: ${escapeHtml(note.trim())}`);
  }

  lines.push("");
  lines.push("Open World kanaliga obuna bo'ling: @Open_World_LC");
  lines.push("Open World guruhiga obuna bo'ling: @openworld_m");

  return lines.join('\n');
};

