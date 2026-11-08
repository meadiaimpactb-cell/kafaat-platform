'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { db, users, organizations } from '@/db';
import { createSession, destroySession, findUserByEmail, hashPassword, homeFor, verifyPassword } from '@/lib/auth';
import { notifyStaff } from '@/lib/notify';

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

const Reg = z.object({
  orgName: z.string().min(3, 'اكتب اسم الجهة'),
  name: z.string().min(3, 'اكتب اسمك'),
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  phone: z.string().min(9, 'رقم الجوال غير صحيح'),
  password: z.string().min(8, 'كلمة المرور 8 أحرف على الأقل'),
  agree: z.literal('on', { error: 'يلزم الموافقة على الشروط' }),
});
export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const raw = Object.fromEntries(['orgName', 'name', 'email', 'phone', 'password', 'agree'].map(k => [k, String(fd.get(k) ?? '')]));
  const p = Reg.safeParse(raw);
  if (!p.success) return { error: p.error.issues[0].message, fields: { ...raw, password: '' } };
  if (await findUserByEmail(p.data.email)) return { error: 'يوجد حساب بهذا البريد. سجّل الدخول.', fields: { ...raw, password: '' } };
  const orgId = createId(); const userId = createId();
  await db.insert(organizations).values({ id: orgId, name: p.data.orgName, email: p.data.email, phone: p.data.phone, contactName: p.data.name });
  await db.insert(users).values({ id: userId, email: p.data.email.toLowerCase(), passwordHash: await hashPassword(p.data.password), name: p.data.name, phone: p.data.phone, role: 'ORG_USER', orgId, orgRole: 'OWNER' });
  await notifyStaff('تسجيل جهة جديدة', p.data.orgName, '/admin/organizations');
  await createSession(userId);
  redirect('/portal/onboarding');
}

export async function logoutAction() {
  await destroySession();
  redirect('/login');
}
