import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { and, eq, gt } from 'drizzle-orm';
import { cache } from 'react';
import { db, users, sessions, organizations, organizationMembers } from '@/db';
import { randomToken } from './crypto';
import { ALL_PERMISSIONS, type Permission } from './permissions';
import type { Role } from '@/db/schema';

export const SESSION_COOKIE = 'kafaat_session';
const SESSION_DAYS = 14;

type OrgRow = typeof organizations.$inferSelect;
/** org = الجهة النشطة حالياً، وorgs = كل الجهات التي يديرها الحساب (حساب واحد قد يخدم عدة جهات) */
export type SessionUser = typeof users.$inferSelect & { org: OrgRow | null; orgs: OrgRow[]; orgIds: string[] };

export async function hashPassword(p: string) { return bcrypt.hash(p, 10); }
export async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h); }

export async function createSession(userId: string) {
  const id = randomToken(32);
  const h = await headers();
  await db.insert(sessions).values({ id, userId, expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5), ip: h.get('x-forwarded-for')?.split(',')[0] ?? null, userAgent: h.get('user-agent')?.slice(0, 250) ?? null });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  (await cookies()).set(SESSION_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' && (process.env.APP_URL || '').startsWith('https'), path: '/', maxAge: SESSION_DAYS * 86400 });
}

export async function destroySession() {
  const c = await cookies(); const id = c.get(SESSION_COOKIE)?.value;
  if (id) await db.delete(sessions).where(eq(sessions.id, id));
  c.delete(SESSION_COOKIE);
}

/** المستخدم الحالي (مخزّن لمدة الطلب) */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const rows = await db.select({ u: users, o: organizations }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(organizations, eq(organizations.id, users.orgId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()))).limit(1);
  if (!rows.length || !rows[0].u.active) return null;
  const u = rows[0].u; let org = rows[0].o;
  let orgs: OrgRow[] = [];
  if (u.role === 'ORG_USER') {
    orgs = (await db.select({ o: organizations }).from(organizationMembers).innerJoin(organizations, eq(organizations.id, organizationMembers.orgId)).where(eq(organizationMembers.userId, u.id)).orderBy(organizationMembers.createdAt)).map(r => r.o);
    // الجهة النشطة يجب أن تكون ضمن عضويات الحساب؛ وإلا فأول جهة له
    if (!org || !orgs.some(o => o.id === org!.id)) org = orgs[0] ?? null;
  }
  return { ...u, orgId: org?.id ?? null, org, orgs, orgIds: orgs.map(o => o.id) };
});

/** هل يملك مستخدم الجهة صلاحية على هذه الجهة؟ */
export const ownsOrg = (u: Pick<SessionUser, 'orgIds'>, orgId: string | null | undefined) => !!orgId && u.orgIds.includes(orgId);

export const homeFor = (role: Role) => (role === 'ORG_USER' ? '/portal' : role === 'ASSESSOR' ? '/assessor' : '/admin');

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect('/login');
  if (roles && !roles.includes(u.role)) redirect(homeFor(u.role));
  return u;
}

/** صفحات البوابة التي تحتاج جهة نشطة: بلا جهة يُوجَّه المستخدم إلى إضافة جهته أولاً */
export async function requireOrgUser(): Promise<SessionUser & { org: NonNullable<SessionUser['org']>; orgId: string }> {
  const u = await requireUser(['ORG_USER']);
  if (!u.org) redirect('/portal/onboarding');
  return u as SessionUser & { org: NonNullable<SessionUser['org']>; orgId: string };
}

export function permissionsOf(u: Pick<SessionUser, 'role' | 'permissions'>): Permission[] {
  if (u.role === 'SUPER_ADMIN') return ALL_PERMISSIONS;
  if (u.role === 'ACCOUNT_MANAGER') return (u.permissions ?? []) as Permission[];
  return [];
}
export const can = (u: Pick<SessionUser, 'role' | 'permissions'>, p: Permission) => permissionsOf(u).includes(p);

/** للوحة التحكم: أدمن أو مدير حساب يملك الصلاحية */
export async function requireStaff(perm?: Permission): Promise<SessionUser> {
  const u = await requireUser(['SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  if (perm && !can(u, perm)) redirect('/admin?denied=1');
  return u;
}
export async function assertStaff(perm?: Permission) {
  const u = await currentUser();
  if (!u || !['SUPER_ADMIN', 'ACCOUNT_MANAGER'].includes(u.role) || (perm && !can(u, perm))) throw new Error('غير مصرح');
  return u;
}

export async function findUserByEmail(email: string) {
  return (await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1))[0];
}
