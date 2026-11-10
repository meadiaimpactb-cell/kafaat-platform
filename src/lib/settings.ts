import 'server-only';
import { eq } from 'drizzle-orm';
import { db, settings } from '@/db';
import { sql } from 'drizzle-orm';

export interface PricingSettings { certificate: number; visit: number; currency: string; vatRate: number; pricesIncludeVat: boolean }
export interface SellerSettings { name: string; vatNumber: string; crNumber: string; address: string; email: string; phone: string }
export interface BankSettings { bankName: string; accountName: string; iban: string; note: string }
export interface AiSettings { enabled: boolean; model: string; apiKey: string; maxFileMb: number; autoAnalyze: boolean }
export type SocialProvider = 'google' | 'facebook' | 'linkedin';
export interface SocialSettings { google: SocialCfg; facebook: SocialCfg; linkedin: SocialCfg }
export interface SocialCfg { enabled: boolean; clientId: string; clientSecret: string }
export interface GeneralSettings { platformName: string; supportEmail: string; supportPhone: string; visitSampleSize: number }

export const DEFAULTS = {
  pricing: { certificate: 500, visit: 5000, currency: 'SAR', vatRate: 15, pricesIncludeVat: true } as PricingSettings,
  seller: { name: 'كفاءة الأثر', vatNumber: '', crNumber: '', address: 'المملكة العربية السعودية', email: 'info@kafaat.sa', phone: '' } as SellerSettings,
  bank: { bankName: '', accountName: '', iban: '', note: 'يُرجى كتابة رقم الفاتورة في وصف التحويل' } as BankSettings,
  ai: { enabled: true, model: 'claude-sonnet-5-5', apiKey: '', maxFileMb: 20, autoAnalyze: true } as AiSettings,
  social: { google: { enabled: false, clientId: '', clientSecret: '' }, facebook: { enabled: false, clientId: '', clientSecret: '' }, linkedin: { enabled: false, clientId: '', clientSecret: '' } } as SocialSettings,
  general: { platformName: 'منصة كفاءة الأثر', supportEmail: 'support@kafaat.sa', supportPhone: '', visitSampleSize: 20 } as GeneralSettings,
};
type Defaults = typeof DEFAULTS;

export async function getSetting<K extends keyof Defaults>(key: K): Promise<Defaults[K]> {
  const row = (await db.select().from(settings).where(eq(settings.key, key)).limit(1))[0];
  return { ...DEFAULTS[key], ...((row?.value as object) ?? {}) } as Defaults[K];
}
export async function setSetting<K extends keyof Defaults>(key: K, value: Partial<Defaults[K]>) {
  const cur = await getSetting(key);
  const v = { ...cur, ...value };
  await db.insert(settings).values({ key, value: v }).onDuplicateKeyUpdate({ set: { value: v } });
  return v;
}

/** أرقام تسلسلية آمنة من التزامن: KA-2026-0001 */
export async function nextNumber(prefix: string, year = new Date().getFullYear()) {
  const key = `${prefix}-${year}`;
  const [res] = (await db.execute(sql`INSERT INTO counters (\`key\`, \`value\`) VALUES (${key}, LAST_INSERT_ID(1)) ON DUPLICATE KEY UPDATE \`value\` = LAST_INSERT_ID(\`value\` + 1)`)) as unknown as [{ insertId: number }];
  return `${prefix}-${year}-${String(res.insertId).padStart(4, '0')}`;
}
