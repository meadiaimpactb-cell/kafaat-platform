import 'server-only';
import { and, eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db, users, userIdentities } from '@/db';
import { getSetting, type SocialProvider } from './settings';
import { decrypt, randomToken } from './crypto';
import { hashPassword } from './auth';

export const SOCIAL: Record<SocialProvider, { name: string; auth: string; token: string; userinfo: string; scope: string; env: [string, string]; docs: string }> = {
  google: { name: 'Google', auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', userinfo: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email profile', env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], docs: 'console.cloud.google.com ← APIs & Services ← Credentials ← OAuth client ID (Web application)' },
  facebook: { name: 'Facebook', auth: 'https://www.facebook.com/v19.0/dialog/oauth', token: 'https://graph.facebook.com/v19.0/oauth/access_token', userinfo: 'https://graph.facebook.com/v19.0/me?fields=id,name,email', scope: 'email,public_profile', env: ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET'], docs: 'developers.facebook.com ← My Apps ← Create App ← Facebook Login' },
  linkedin: { name: 'LinkedIn', auth: 'https://www.linkedin.com/oauth/v2/authorization', token: 'https://www.linkedin.com/oauth/v2/accessToken', userinfo: 'https://api.linkedin.com/v2/userinfo', scope: 'openid profile email', env: ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET'], docs: 'linkedin.com/developers ← Create app ← Products ← Sign In with LinkedIn using OpenID Connect' },
};
export const isProvider = (p: string): p is SocialProvider => p in SOCIAL;

/** نقاط النهاية: للاختبار المحلي فقط يمكن توجيهها إلى خادم محاكاة عبر OAUTH_TEST_BASE */
export function endpoints(p: SocialProvider) {
  const base = process.env.OAUTH_TEST_BASE;
  return base ? { auth: `${base}/${p}/authorize`, token: `${base}/${p}/token`, userinfo: `${base}/${p}/userinfo` } : { auth: SOCIAL[p].auth, token: SOCIAL[p].token, userinfo: SOCIAL[p].userinfo };
}

export async function providerConfig(p: SocialProvider) {
  const s = (await getSetting('social'))[p];
  const clientId = s.clientId || process.env[SOCIAL[p].env[0]] || '';
  const clientSecret = decrypt(s.clientSecret) || process.env[SOCIAL[p].env[1]] || '';
  const enabled = (s.enabled || !!(process.env[SOCIAL[p].env[0]] && process.env[SOCIAL[p].env[1]])) && !!clientId && !!clientSecret;
  return { enabled, clientId, clientSecret };
}

export const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
export const callbackUrl = (p: SocialProvider) => `${appUrl()}/api/auth/${p}/callback`;

export type SocialProfile = { sub: string; email: string | null; emailVerified: boolean; name: string };

export async function fetchProfile(p: SocialProvider, code: string): Promise<SocialProfile> {
  const cfg = await providerConfig(p); const ep = endpoints(p);
  const tok = await fetch(ep.token, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: callbackUrl(p), client_id: cfg.clientId, client_secret: cfg.clientSecret }) });
  const tj = await tok.json().catch(() => ({}));
  if (!tok.ok || !tj.access_token) throw new Error('token');
  const ui = await fetch(p === 'facebook' && !process.env.OAUTH_TEST_BASE ? `${ep.userinfo}&access_token=${encodeURIComponent(tj.access_token)}` : ep.userinfo, { headers: { Authorization: `Bearer ${tj.access_token}`, Accept: 'application/json' } });
  const j = await ui.json().catch(() => ({}));
  if (!ui.ok) throw new Error('userinfo');
  if (p === 'facebook') return { sub: String(j.id ?? j.sub ?? ''), email: j.email ?? null, emailVerified: !!j.email, name: j.name ?? '' }; // فيسبوك لا يعيد إلا بريداً مؤكداً
  return { sub: String(j.sub ?? ''), email: j.email ?? null, emailVerified: j.email_verified === true || j.email_verified === 'true', name: j.name ?? [j.given_name, j.family_name].filter(Boolean).join(' ') };
}

/** يربط الهوية بحساب قائم أو ينشئ حساب جهة جديداً. حسابات الفريق (أدمن/مقيّم) لا تدخل إلا بكلمة المرور. */
export async function resolveSocialUser(provider: SocialProvider, prof: SocialProfile): Promise<{ userId: string; isNew: boolean } | { error: string }> {
  if (!prof.sub) return { error: 'تعذر قراءة بيانات الحساب' };
  const ident = (await db.select().from(userIdentities).where(and(eq(userIdentities.provider, provider), eq(userIdentities.providerUserId, prof.sub))).limit(1))[0];
  if (ident) {
    const u = (await db.select().from(users).where(eq(users.id, ident.userId)).limit(1))[0];
    if (!u || !u.active) return { error: 'الحساب موقوف. تواصل مع الإدارة.' };
    if (u.role !== 'ORG_USER') return { error: 'حسابات الفريق تدخل بالبريد وكلمة المرور' };
    return { userId: u.id, isNew: false };
  }
  if (!prof.email) return { error: 'لم نتمكن من الحصول على بريدك الإلكتروني من الحساب. أنشئ حساباً بالبريد وكلمة المرور.' };
  const email = prof.email.toLowerCase();
  const existing = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (existing) {
    if (!prof.emailVerified) return { error: 'بريد هذا الحساب غير مؤكد لدى المزوّد. سجّل الدخول بكلمة المرور.' };
    if (existing.role !== 'ORG_USER') return { error: 'حسابات الفريق تدخل بالبريد وكلمة المرور' };
    if (!existing.active) return { error: 'الحساب موقوف. تواصل مع الإدارة.' };
    await db.insert(userIdentities).values({ userId: existing.id, provider, providerUserId: prof.sub, email });
    return { userId: existing.id, isNew: false };
  }
  const userId = createId();
  await db.insert(users).values({ id: userId, email, passwordHash: await hashPassword(randomToken(24)), name: prof.name || email.split('@')[0], role: 'ORG_USER' });
  await db.insert(userIdentities).values({ userId, provider, providerUserId: prof.sub, email });
  return { userId, isNew: true };
}
