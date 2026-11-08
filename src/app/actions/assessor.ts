'use server';
import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { db, assessments, factorReviews, infoRequests, visits } from '@/db';
import { currentUser, can, type SessionUser } from '@/lib/auth';
import { getAssessment, completeDesk, completeVerification, initVerifiedReviews } from '@/lib/workflow';
import { notify, notifyOrg, notifyStaff, logActivity } from '@/lib/notify';
import type { FormState } from './auth';

type Phase = 'DESK' | 'VERIFIED';

/** المقيّم المسند، أو الأدمن، أو مدير الحساب بصلاحية إدارة التقييمات */
async function reviewer(assessmentId: string, phase: Phase = 'DESK') {
  const u = await currentUser();
  if (!u) throw new Error('سجّل الدخول');
  const a = await getAssessment(assessmentId);
  if (!a) throw new Error('الطلب غير موجود');
  const staff = u.role === 'SUPER_ADMIN' || (u.role === 'ACCOUNT_MANAGER' && can(u, 'assessments.manage'));
  if (phase === 'VERIFIED') {
    const v = (await db.select().from(visits).where(eq(visits.assessmentId, assessmentId)).limit(1))[0];
    if (!staff && v?.consultantId !== u.id) throw new Error('غير مصرح: لست مستشار الزيارة');
    if (a.status !== 'VERIFICATION') throw new Error('مرحلة التحقق غير مفتوحة');
  } else {
    if (!staff && a.assessorId !== u.id && a.secondAssessorId !== u.id) throw new Error('غير مصرح');
    if (!['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(a.status)) throw new Error('الطلب ليس في مرحلة المراجعة المكتبية');
  }
  return { u: u as SessionUser, a };
}
const refresh = (id: string) => { revalidatePath(`/assessor/assessments/${id}`, 'layout'); revalidatePath(`/admin/assessments/${id}`); };

export async function startReview(assessmentId: string) {
  const { u, a } = await reviewer(assessmentId);
  if (a.status === 'SUBMITTED') {
    await db.update(assessments).set({ status: 'UNDER_REVIEW', reviewStartedAt: new Date(), assessorId: a.assessorId ?? (u.role === 'ASSESSOR' ? u.id : null) }).where(eq(assessments.id, assessmentId));
    await logActivity('review.started', { assessmentId, userId: u.id });
    await notifyOrg(a.orgId, 'بدأ المقيّم مراجعة ملفكم', a.number, `/portal/assessments/${assessmentId}`);
  }
  refresh(assessmentId);
}

export async function saveReview(assessmentId: string, factorId: string, phase: Phase, patch: { level?: number | null; justification?: string | null; evidenceRef?: string | null; needsVerification?: boolean }) {
  const { u, a } = await reviewer(assessmentId, phase);
  if (patch.level != null && (patch.level < 0 || patch.level > 4)) throw new Error('المستوى من 0 إلى 4');
  if (phase === 'DESK' && a.status === 'SUBMITTED') await db.update(assessments).set({ status: 'UNDER_REVIEW', reviewStartedAt: new Date() }).where(eq(assessments.id, assessmentId));
  const ex = (await db.select().from(factorReviews).where(and(eq(factorReviews.assessmentId, assessmentId), eq(factorReviews.factorId, factorId), eq(factorReviews.phase, phase))).limit(1))[0];
  if (ex) await db.update(factorReviews).set({ ...patch, reviewerId: u.id }).where(eq(factorReviews.id, ex.id));
  else await db.insert(factorReviews).values({ assessmentId, factorId, phase, ...patch, reviewerId: u.id });
  return { ok: true };
}

/** اعتماد مقترحات المساعد للعوامل التي لم يقدّرها المقيّم بعد */
export async function acceptAiSuggestions(assessmentId: string) {
  const { u } = await reviewer(assessmentId);
  const rs = await db.select().from(factorReviews).where(and(eq(factorReviews.assessmentId, assessmentId), eq(factorReviews.phase, 'DESK'), isNull(factorReviews.level)));
  let n = 0;
  for (const r of rs) if (r.aiLevel != null) { await db.update(factorReviews).set({ level: r.aiLevel, justification: r.justification ?? `اعتُمد مقترح المساعد: ${r.aiRationale ?? ''}`.slice(0, 2000), reviewerId: u.id }).where(eq(factorReviews.id, r.id)); n++; }
  await logActivity('review.ai_accepted', { assessmentId, userId: u.id, details: { count: n } });
  refresh(assessmentId);
  return { count: n };
}

export async function createInfoRequest(_: FormState, fd: FormData): Promise<FormState> {
  const assessmentId = String(fd.get('assessmentId')); const message = String(fd.get('message') ?? '').trim(); const factorId = String(fd.get('factorId') ?? '') || null;
  const { u, a } = await reviewer(assessmentId);
  if (message.length < 5) return { error: 'اكتب الاستيضاح بوضوح' };
  await db.insert(infoRequests).values({ assessmentId, factorId, message, createdById: u.id });
  await db.update(assessments).set({ status: 'INFO_REQUESTED' }).where(eq(assessments.id, assessmentId));
  await logActivity('info.requested', { assessmentId, userId: u.id, details: { factorId } });
  await notifyOrg(a.orgId, 'المقيّم يطلب استيضاحاً', message.slice(0, 140), `/portal/assessments/${assessmentId}/requests`);
  refresh(assessmentId);
  return { ok: 'أُرسل الاستيضاح للجهة' };
}
export async function closeInfoRequest(id: string) {
  const r = (await db.select().from(infoRequests).where(eq(infoRequests.id, id)).limit(1))[0];
  if (!r) return;
  await reviewer(r.assessmentId);
  await db.update(infoRequests).set({ status: 'CLOSED' }).where(eq(infoRequests.id, id));
  const open = (await db.select().from(infoRequests).where(and(eq(infoRequests.assessmentId, r.assessmentId), eq(infoRequests.status, 'OPEN')))).length;
  if (!open) await db.update(assessments).set({ status: 'UNDER_REVIEW' }).where(and(eq(assessments.id, r.assessmentId), eq(assessments.status, 'INFO_REQUESTED')));
  refresh(r.assessmentId);
}

export async function completeDeskAction(_: FormState, fd: FormData): Promise<FormState> {
  const assessmentId = String(fd.get('assessmentId'));
  const { u, a } = await reviewer(assessmentId);
  const open = (await db.select().from(infoRequests).where(and(eq(infoRequests.assessmentId, assessmentId), eq(infoRequests.status, 'OPEN')))).length;
  if (open) return { error: `توجد ${open} استيضاحات مفتوحة؛ أغلقها أو انتظر رد الجهة` };
  const summary = String(fd.get('summary') ?? '').trim();
  if (summary.length < 20) return { error: 'اكتب خلاصة المقيّم (20 حرفاً على الأقل)' };
  const recs = String(fd.get('recommendations') ?? '').split('\n').map(s => s.trim()).filter(Boolean).map((text, i) => ({ text, factors: [] as string[], priority: i < 2 ? 1 : i < 5 ? 2 : 3 }));
  if (recs.length) await db.update(assessments).set({ recommendations: recs }).where(eq(assessments.id, assessmentId));
  try { const r = await completeDesk(assessmentId, u, summary); refresh(assessmentId); return { ok: `اعتُمد التقييم المكتبي: ${r.total} (${r.status === 'مؤهل' ? r.level : 'قيد التأهيل'})` }; }
  catch (e) { return { error: (e as Error).message }; }
  finally { void a; }
}

// ---------------------------------------------------------------- زيارة التحقق
async function visitOf(visitId: string) {
  const u = await currentUser(); if (!u) throw new Error('سجّل الدخول');
  const v = (await db.select().from(visits).where(eq(visits.id, visitId)).limit(1))[0];
  if (!v) throw new Error('الزيارة غير موجودة');
  const staff = u.role === 'SUPER_ADMIN' || (u.role === 'ACCOUNT_MANAGER' && can(u, 'visits.manage'));
  if (!staff && v.consultantId !== u.id) throw new Error('غير مصرح');
  return { u, v, a: await getAssessment(v.assessmentId) };
}
export async function saveVisitWork(_: FormState, fd: FormData): Promise<FormState> {
  const { v } = await visitOf(String(fd.get('visitId')));
  const checklist = Object.fromEntries(['sample', 'interviews', 'system', 'records', 'minutes', 'beneficiaries'].map(k => [k, fd.get('c_' + k) === 'on']));
  const checked = Number(fd.get('checked') || 0), matched = Number(fd.get('matched') || 0);
  if (matched > checked) return { error: 'عدد الحالات المطابقة لا يتجاوز عدد الحالات المفحوصة' };
  await db.update(visits).set({ checklist, sampleResult: { checked, matched, notes: String(fd.get('sampleNotes') ?? '') }, notes: String(fd.get('notes') ?? '') || null }).where(eq(visits.id, v.id));
  revalidatePath(`/assessor/visits/${v.id}`);
  return { ok: 'حُفظت بيانات الزيارة' };
}
export async function completeVisit(_: FormState, fd: FormData): Promise<FormState> {
  const { u, v, a } = await visitOf(String(fd.get('visitId')));
  if (v.status !== 'SCHEDULED' && v.status !== 'PAID') return { error: 'الزيارة ليست في حالة قابلة للإنهاء' };
  if (!v.sampleResult?.checked) return { error: 'سجّل نتيجة عينة التتبع أولاً واحفظها' };
  await initVerifiedReviews(a.id);
  await db.update(visits).set({ status: 'COMPLETED', completedAt: new Date() }).where(eq(visits.id, v.id));
  await logActivity('visit.completed', { assessmentId: a.id, userId: u.id, details: v.sampleResult });
  await notifyStaff('اكتملت زيارة تحقق: الشهادة بانتظار الاعتماد', a.number, `/admin/assessments/${a.id}`);
  await notifyOrg(a.orgId, 'اكتملت زيارة التحقق', 'الشهادة الموثقة قيد الاعتماد النهائي.', `/portal/assessments/${a.id}/verification`);
  revalidatePath(`/assessor/visits/${v.id}`);
  return { ok: 'أُنهيت الزيارة. يعتمد مدير الحساب الشهادة الموثقة.' };
}

/** إصدار الشهادة الموثقة: أدمن أو مدير حساب بصلاحية الإصدار */
export async function issueVerifiedAction(assessmentId: string) {
  const u = await currentUser();
  if (!u || !(u.role === 'SUPER_ADMIN' || (u.role === 'ACCOUNT_MANAGER' && can(u, 'certificates.issue')))) throw new Error('غير مصرح');
  const { num } = await completeVerification(assessmentId, u);
  revalidatePath(`/admin/assessments/${assessmentId}`);
  return { ok: `صدرت الشهادة ${num}` };
}
export async function notifyAssessorNudge(assessmentId: string) {
  const a = await getAssessment(assessmentId);
  await notify([a.assessorId], 'تذكير بمراجعة طلب', a.number, `/assessor/assessments/${assessmentId}`);
}
