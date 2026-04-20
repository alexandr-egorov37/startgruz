/**
 * Утилита для маски телефона
 * Формат: +7(961)116-66-03
 */

export function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) return '+7';

  // Normalise first digit: 8 → 7; anything else (e.g. user typed 9) → prepend 7
  let normalized: string;
  if (digits[0] === '7') {
    normalized = digits;
  } else if (digits[0] === '8') {
    normalized = '7' + digits.slice(1);
  } else {
    normalized = '7' + digits;
  }

  const limited = normalized.slice(0, 11);

  let formatted = '+7';
  if (limited.length > 1) formatted += '(' + limited.slice(1, 4);
  if (limited.length > 4) formatted += ')' + limited.slice(4, 7);
  if (limited.length > 7) formatted += '-' + limited.slice(7, 9);
  if (limited.length > 9) formatted += '-' + limited.slice(9, 11);

  return formatted;
}

export function extractPhoneDigits(formattedPhone: string): string {
  const digits = formattedPhone.replace(/\D/g, '');
  if (digits.startsWith('8') && digits.length === 11) return '7' + digits.slice(1);
  return digits.startsWith('7') ? digits : '7' + digits;
}

export function validatePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'));
}
