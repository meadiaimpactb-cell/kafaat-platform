import 'server-only';
import { inArray, eq, or, and } from 'drizzle-orm';
import { db, notifications, users, activityLogs, organizationMembers } from '@/db';
import { sendMail, mailTemplate, esc } from './mail';

export async function notify(userIds: (string | null | undefined)[], title: string, body?: string, link?: string) {
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  if (!ids.length) return;
  await db.insert(notifications).values(ids.map(userId => ({ userId, title, body, link })));
  try {
    const rs = await db.select({ email: users.email }).from(users).where(inArray(users.id, ids));
    const url = link ? (process.env.APP_URL || '').replace(/\/$/, '') + link : '';
    await sendMail(rs.map(r => r.email), title, mailTemplate(title, esc(body ?? ''), url ? { label: 'فتح في المنصة', url } : undefined));
  } catch (e) { console.error('notify mail failed', e); }
}
/** كل أعضاء الجهة (حساب واحد قد يدير عدة جهات، فالعضوية هي المرجع) */
export async function notifyOrg(orgId: string, title: string, body?: string, link?: string) {
  const rs = await db.select({ id: users.id }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(and(eq(organizationMembers.orgId, orgId), eq(users.active, true)));
  await notify(rs.map(r => r.id), title, body, link);
}
export async function notifyStaff(title: string, body?: string, link?: string, extra: (string | null | undefined)[] = []) {
  const rs = await db.select({ id: users.id }).from(users).where(and(or(eq(users.role, 'SUPER_ADMIN'), eq(users.role, 'ACCOUNT_MANAGER')), eq(users.active, true)));
  await notify([...rs.map(r => r.id), ...extra], title, body, link);
}
export async function logActivity(action: string, opts: { assessmentId?: string | null; userId?: string | null; details?: Record<string, unknown> } = {}) {
  await db.insert(activityLogs).values({ action, assessmentId: opts.assessmentId ?? null, userId: opts.userId ?? null, details: opts.details });
}
