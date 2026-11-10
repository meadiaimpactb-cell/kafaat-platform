import 'server-only';
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db, messages, assessments, organizations, users } from '@/db';
import type { SessionUser } from './auth';

export type Viewer = 'ORG' | 'EXPERT' | 'STAFF';
export type ThreadItem = { id: string; from: 'ORG' | 'EXPERT' | 'STAFF'; label: string; body: string; at: Date; mine: boolean };

/** الأسماء التي تراها الجهة: لا تحمل أي بيانات تعريفية للخبير */
export const ORG_VIEW_LABEL = { ORG: 'أنتم', EXPERT: 'الخبير المراجع', STAFF: 'فريق كفاءة الأثر' } as const;

export const isAssignedExpert = (u: Pick<SessionUser, 'id'>, a: { assessorId: string | null; secondAssessorId: string | null; verifierId: string | null }) =>
  [a.assessorId, a.secondAssessorId, a.verifierId].includes(u.id);

/** يحمّل المحادثة ويهيئها للعرض بحسب القارئ. للجهة تُحجب هوية الخبير تماماً (لا اسم ولا معرّف). */
export async function loadThread(assessmentId: string, viewer: Viewer): Promise<ThreadItem[]> {
  const rows = await db.select({ m: messages, name: users.name }).from(messages).leftJoin(users, eq(users.id, messages.senderId)).where(eq(messages.assessmentId, assessmentId)).orderBy(messages.createdAt);
  return rows.map(({ m, name }) => ({
    id: m.id, from: m.senderRole, body: m.body, at: m.createdAt, mine: m.senderRole === viewer || (viewer === 'STAFF' && m.senderRole === 'STAFF'),
    label: viewer === 'ORG' ? ORG_VIEW_LABEL[m.senderRole] : m.senderRole === 'ORG' ? 'الجهة' : `${m.senderRole === 'EXPERT' ? 'خبير' : 'إدارة'}: ${name ?? '—'}`,
  }));
}

/** عدد الرسائل غير المقروءة للجهة (من الخبير أو الفريق) عبر جهات الحساب */
export async function orgUnread(orgIds: string[]) {
  if (!orgIds.length) return 0;
  const r = await db.select({ c: sql<number>`count(*)` }).from(messages).innerJoin(assessments, eq(assessments.id, messages.assessmentId))
    .where(and(inArray(assessments.orgId, orgIds), inArray(messages.senderRole, ['EXPERT', 'STAFF']), isNull(messages.orgReadAt)));
  return Number(r[0].c);
}
/** غير المقروء لدى الخبير: رسائل الجهات في طلباته المسندة */
export async function expertUnread(userId: string) {
  const r = await db.select({ c: sql<number>`count(*)` }).from(messages).innerJoin(assessments, eq(assessments.id, messages.assessmentId))
    .where(and(eq(messages.senderRole, 'ORG'), isNull(messages.staffReadAt), or(eq(assessments.assessorId, userId), eq(assessments.secondAssessorId, userId), eq(assessments.verifierId, userId))));
  return Number(r[0].c);
}
export async function staffUnread() {
  const r = await db.select({ c: sql<number>`count(*)` }).from(messages).where(and(eq(messages.senderRole, 'ORG'), isNull(messages.staffReadAt)));
  return Number(r[0].c);
}

export type InboxRow = { assessmentId: string; number: string; orgName: string; status: string; last: { body: string; at: Date; role: string } | null; unread: number; count: number };
/** صندوق وارد: لكل طلب آخر رسالة وعدد غير المقروء (unreadRoles = أدوار المرسلين التي تعد غير مقروءة للقارئ) */
export async function loadInbox(assessmentIds: string[], unreadRoles: ('ORG' | 'EXPERT' | 'STAFF')[], readCol: 'orgReadAt' | 'staffReadAt'): Promise<InboxRow[]> {
  if (!assessmentIds.length) return [];
  const as = await db.select({ a: assessments, orgName: organizations.name }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(inArray(assessments.id, assessmentIds));
  const ms = await db.select().from(messages).where(inArray(messages.assessmentId, assessmentIds)).orderBy(desc(messages.createdAt));
  return as.map(({ a, orgName }) => {
    const mine = ms.filter(m => m.assessmentId === a.id);
    return { assessmentId: a.id, number: a.number, orgName, status: a.status, last: mine[0] ? { body: mine[0].body, at: mine[0].createdAt, role: mine[0].senderRole } : null, count: mine.length,
      unread: mine.filter(m => unreadRoles.includes(m.senderRole) && !m[readCol]).length };
  }).sort((x, y) => (y.last?.at.getTime() ?? 0) - (x.last?.at.getTime() ?? 0));
}
