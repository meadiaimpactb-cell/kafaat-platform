import crypto from 'crypto';

const key = () => crypto.createHash('sha256').update(process.env.APP_SECRET || 'dev-secret').digest();

/** تشفير القيم السرية (مفاتيح بوابات الدفع ومفتاح Claude) قبل حفظها في قاعدة البيانات */
export function encrypt(plain: string): string {
  if (!plain) return '';
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return 'enc:' + Buffer.concat([iv, c.getAuthTag(), enc]).toString('base64');
}
export function decrypt(value?: string | null): string {
  if (!value) return '';
  if (!value.startsWith('enc:')) return value;
  try {
    const buf = Buffer.from(value.slice(4), 'base64');
    const d = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString('utf8');
  } catch { return ''; }
}
export const mask = (v: string) => (v ? (v.length <= 8 ? '••••' : v.slice(0, 4) + '••••' + v.slice(-4)) : '');
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const sha256 = (b: Buffer | string) => crypto.createHash('sha256').update(b).digest('hex');
export function randomCode(len = 10) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
