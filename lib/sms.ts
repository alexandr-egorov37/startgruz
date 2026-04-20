import crypto from 'crypto';

export async function sendSMS(phone: string, code: string): Promise<boolean> {
  console.log('🔥 NEW SMS FUNCTION CALLED 🔥');
  console.log('[SMS FUNCTION CALLED]');
  
  const apiKey = process.env.SMSRU_API_KEY;

  if (!apiKey) {
    throw new Error('SMS API KEY NOT SET');
  }

  const message = `Ваш код: ${code}`;
  
  console.log('[SMS SEND]', { phone: phone.replace(/[^\d]/g, '').slice(-4) });

  const url = `https://sms.ru/sms/send?api_id=${apiKey}&to=${phone}&msg=${encodeURIComponent(message)}&json=1`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') {
    console.error('SMS ERROR:', data);
    throw new Error('SMS FAILED');
  }

  return true;
}

export function generateCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}
