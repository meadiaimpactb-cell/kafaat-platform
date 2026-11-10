'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, messages, assessments } from '@/db';
import { currentUser, ownsOrg, can } from '@/lib/auth';
import { notify, notifyOrg, notifyStaff, logActivity } from '@/lib/notify';
import { isAssignedExpert } from '@/lib/messages';
import type { FormState } from './auth';

const MAX = 4000;

/** إرسال رسالة ضمن محادثة طلب التقييم. دور المرسل يُستنتج من الحساب لا من المتصفح. */
export async function sendMessage(_: FormState, fd: FormData): Promise<FormState> {
  const u = await currentUser();
  if (!u) return { error: 'سجّل الدخول أولاً' };
  const assessmentId = String(fd.get('assessmentId') ?? ''); const as = String(fd.get('as') ?? '');
  const body = String(fd.get('body') ?? '').trim();
  if (!body) return { error: 'اكتب رسالتك أولاً' };
  if (body.length > MAX) return { error: `الحد الأقصى ${MAX} حرفاً`, fields: { body } };
  const a = (await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1))[0];
  if (!a || a.status === 'CANCELLED') return { error: 'الطلب غير متاح للمراسلة' };

  let role: 'ORG' | 'EXPERT' | 'STAFF';
  if (u.role === 'ORG_USER') { if (!ownsOrg(u, a.orgId)) return { error: 'غير مصرح' }; role = 'ORG'; }
  else if (as === 'EXPERT' && isAssignedExpert(u, a)) role = 'EXPERT';
  else if (u.role === 'SUPER_ADMIN' || (u.role === 'ACCOUNT_MANAGER' && can(u, 'assessments.view'))) role = 'STAFF';
  else return { error: 'غير مصرح' };

  await db.insert(messages).values({ assessmentId, senderRole: role, senderId: u.id, body, ...(role === 'ORG' ? { orgReadAt: new Date() } : { staffReadAt: new Date() }) });
  const preview = body.length > 140 ? body.slice(0, 140) + '…' : body;
  if (role === 'ORG') {
    const experts = [a.assessorId, a.secondAssessorId, a.verifierId].filter(Boolean) as string[];
    if (experts.length) { await notify(experts, `رسالة جديدة من الجهة — ${a.number}`, preview, `/assessor/messages/${a.id}`); if (a.managerId) await notify([a.managerId], `رسالة جديدة من الجهة — ${a.number}`, preview, `/admin/messages/${a.id}`); }
    else await notifyStaff(`رسالة جديدة من الجهة — ${a.number}`, preview, `/admin/messages/${a.id}`);
  } else {
    // لا يُذكر اسم الخبير ولا بياناته في الإشعار أو البريد
    await notifyOrg(a.orgId, role === 'EXPERT' ? 'رسالة جديدة من الخبير المراجع' : 'رسالة جديدة من فريق كفاءة الأثر', preview, `/portal/messages/${a.id}`);
  }
  await logActivity('message.sent', { assessmentId, userId: u.id, details: { role } });
  for (const p of [`/portal/messages/${a.id}`, `/assessor/messages/${a.id}`, `/admin/messages/${a.id}`]) revalidatePath(p);
  return { ok: 'أُرسلت الرسالة' };
}

/** تعليم المحادثة مقروءة لدى القارئ */
export async function markThreadRead(assessmentId: string, viewer: 'ORG' | 'STAFF') {
  const u = await currentUser();
  if (!u) return;
  const a = (await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1))[0];
  if (!a) return;
  if (viewer === 'ORG') {
    if (u.role !== 'ORG_USER' || !ownsOrg(u, a.orgId)) return;
    await db.update(messages).set({ orgReadAt: new Date() }).where(and(eq(messages.assessmentId, assessmentId), inArray(messages.senderRole, ['EXPERT', 'STAFF']), isNull(messages.orgReadAt)));
  } else {
    const ok = u.role === 'SUPER_ADMIN' || (u.role === 'ACCOUNT_MANAGER' && can(u, 'assessments.view')) || isAssignedExpert(u, a);
    if (!ok) return;
    await db.update(messages).set({ staffReadAt: new Date() }).where(and(eq(messages.assessmentId, assessmentId), eq(messages.senderRole, 'ORG'), isNull(messages.staffReadAt)));
  }
  revalidatePath('/', 'layout');
}
