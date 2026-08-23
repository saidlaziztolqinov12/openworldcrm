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
