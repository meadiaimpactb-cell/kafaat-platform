'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { and, eq, gt, isNull, count } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { db, users, passwordResets, sessions } from '@/db';
import { createSession, destroySession, findUserByEmail, hashPassword, homeFor, verifyPassword } from '@/lib/auth';
import { notifyStaff } from '@/lib/notify';
import { sendMail, mailTemplate } from '@/lib/mail';
import { randomToken, sha256 } from '@/lib/crypto';

export type FormState = { error?: string; ok?: string; fields?: Record<string, string> } | undefined;

// حماية بسيطة من تخمين كلمات المرور: 8 محاولات خاطئة لكل بريد خلال 15 دقيقة
const attempts = new Map<string, { n: number; at: number }>();
function tooMany(key: string) { const a = attempts.get(key); return !!a && Date.now() - a.at < 15 * 60e3 && a.n >= 8; }
function fail(key: string) { const a = attempts.get(key); attempts.set(key, a && Date.now() - a.at < 15 * 60e3 ? { n: a.n + 1, at: a.at } : { n: 1, at: Date.now() }); }

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get('email') || '').trim().toLowerCase(); const password = String(fd.get('password') || '');
  if (tooMany(email)) return { error: 'محاولات كثيرة. حاول بعد 15 دقيقة.', fields: { email } };
  const u = await findUserByEmail(email);
  if (!u || !(await verifyPassword(password, u.passwordHash))) { fail(email); return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', fields: { email } }; }
  attempts.delete(email);
  if (!u.active) return { error: 'الحساب موقوف. تواصل مع الإدارة.' };
  await createSession(u.id);
  const next = String(fd.get('next') || '');
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : homeFor(u.role));
}

/** التسجيل بحساب شخصي: الجهات تُضاف بعد الدخول، وقد يدير الحساب الواحد أكثر من جهة */
const Reg = z.object({
  name: z.string().min(3, 'اكتب اسمك الكامل'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().regex(/^(\+?966|0)?5\d{8}$/, 'رقم الجوال غير صحيح (مثال: 05xxxxxxxx)'),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل'),
  agree: z.literal('on', { error: 'يلزم الموافقة على الشروط' }),
});
export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const raw = Object.fromEntries(['name', 'email', 'phone', 'password', 'agree'].map(k => [k, String(fd.get(k) ?? '').trim()]));
  const p = Reg.safeParse({ ...raw, phone: raw.phone.replace(/[\s-]/g, '') });
  if (!p.success) return { error: p.error.issues[0].message, fields: { ...raw, password: '' } };
  if (await findUserByEmail(p.data.email)) return { error: 'يوجد حساب بهذا البريد. سجّل الدخول أو استعد كلمة المرور.', fields: { ...raw, password: '' } };
  const userId = createId();
  await db.insert(users).values({ id: userId, email: p.data.email.toLowerCase(), passwordHash: await hashPassword(p.data.password), name: p.data.name, phone: p.data.phone, role: 'ORG_USER' });
  await notifyStaff('حساب جديد على المنصة', p.data.name, '/admin/users');
  await createSession(userId);
  redirect('/portal/onboarding?new=1');
}

// ---------------------------------------------------------------- استعادة كلمة المرور
const RESET_HOURS = 2;
export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'اكتب بريداً إلكترونياً صحيحاً', fields: { email } };
  const generic: FormState = { ok: 'إن كان هذا البريد مسجلاً لدينا فقد أرسلنا إليه رابط استعادة كلمة المرور. الرابط صالح لمدة ساعتين.', fields: { email } };
  const u = await findUserByEmail(email);
  if (!u || !u.active) return generic;
  // حد أقصى 3 طلبات في الساعة لكل حساب
  const recent = (await db.select({ c: count() }).from(passwordResets).where(and(eq(passwordResets.userId, u.id), gt(passwordResets.createdAt, new Date(Date.now() - 3600e3)))))[0].c;
  if (recent >= 3) return generic;
  const token = randomToken(32);
  await db.insert(passwordResets).values({ userId: u.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_HOURS * 3600e3) });
  const url = `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/reset-password/${token}`;
  await sendMail(u.email, 'استعادة كلمة المرور — كفاءة الأثر', mailTemplate('استعادة كلمة المرور', `<p>وصلنا طلب لإعادة تعيين كلمة مرور حسابكم.</p><p>اضغطوا الزر التالي لاختيار كلمة مرور جديدة. الرابط صالح لمدة ${RESET_HOURS} ساعتين ويُستخدم مرة واحدة.</p><p style="color:#6B7A70;font-size:13px">إن لم تطلبوا ذلك فتجاهلوا هذه الرسالة؛ ولن يتغير شيء في حسابكم.</p>`, { label: 'تعيين كلمة مرور جديدة', url }));
  return generic;
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get('token') ?? ''); const pw = String(fd.get('password') ?? ''); const pw2 = String(fd.get('password2') ?? '');
  if (pw.length < 8) return { error: 'كلمة المرور 8 أحرف على الأقل' };
  if (pw !== pw2) return { error: 'كلمتا المرور غير متطابقتين' };
  const r = (await db.select().from(passwordResets).where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date()))).limit(1))[0];
  if (!r) return { error: 'الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.' };
  await db.update(users).set({ passwordHash: await hashPassword(pw) }).where(eq(users.id, r.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.userId, r.userId));
  await db.delete(sessions).where(eq(sessions.userId, r.userId)); // إنهاء كل الجلسات القديمة
  redirect('/login?reset=1');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
