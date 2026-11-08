import 'server-only';
import { inArray, eq, or, and } from 'drizzle-orm';
import { db, notifications, users, activityLogs } from '@/db';

export async function notify(userIds: (string | null | undefined)[], title: string, body?: string, link?: string) {
  const ids = [...new Set(userIds.filter(Boolean) as string[])];
  if (!ids.length) return;
  await db.insert(notifications).values(ids.map(userId => ({ userId, title, body, link })));
  if (process.env.SMTP_HOST) {
    try {
      const nodemailer = await import('nodemailer');
      const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
      const rs = await db.select({ email: users.email }).from(users).where(inArray(users.id, ids));
      const url = link ? (process.env.APP_URL || '') + link : '';
      await t.sendMail({ from: process.env.SMTP_FROM, to: rs.map(r => r.email).join(','), subject: title, html: `<div dir="rtl" style="font-family:Tahoma"><h3>${title}</h3><p>${body ?? ''}</p>${url ? `<p><a href="${url}">فتح في المنصة</a></p>` : ''}</div>` });
    } catch (e) { console.error('mail failed', e); }
  }
}
export async function notifyOrg(orgId: string, title: string, body?: string, link?: string) {
  const rs = await db.select({ id: users.id }).from(users).where(and(eq(users.orgId, orgId), eq(users.active, true)));
  await notify(rs.map(r => r.id), title, body, link);
}
export async function notifyStaff(title: string, body?: string, link?: string, extra: (string | null | undefined)[] = []) {
  const rs = await db.select({ id: users.id }).from(users).where(and(or(eq(users.role, 'SUPER_ADMIN'), eq(users.role, 'ACCOUNT_MANAGER')), eq(users.active, true)));
  await notify([...rs.map(r => r.id), ...extra], title, body, link);
}
export async function logActivity(action: string, opts: { assessmentId?: string | null; userId?: string | null; details?: Record<string, unknown> } = {}) {
  await db.insert(activityLogs).values({ action, assessmentId: opts.assessmentId ?? null, userId: opts.userId ?? null, details: opts.details });
}
