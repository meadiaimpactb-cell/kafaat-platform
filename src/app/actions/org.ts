'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { db, organizations, assessments, answers, documents, payments, infoRequests, visits, notifications } from '@/db';
import { requireUser } from '@/lib/auth';
import { trackOf } from '@/lib/scoring';
import { nextNumber } from '@/lib/settings';
import { createPayment, applyCoupon, startCheckout, markPaid, getGateways } from '@/lib/payments';
import { recomputeProgress, getAssessment } from '@/lib/workflow';
import { analyzeGaps, proposeLevels } from '@/lib/ai';
import { notifyStaff, notify, logActivity } from '@/lib/notify';
import { saveFile } from '@/lib/storage';
import type { FormState } from './auth';

async function orgUser() {
  const u = await requireUser(['ORG_USER']);
  if (!u.orgId) throw new Error('لا توجد جهة مرتبطة بالحساب');
  return u as typeof u & { orgId: string };
}
async function ownAssessment(id: string, editable = false) {
  const u = await orgUser();
  const a = await getAssessment(id);
  if (!a || a.orgId !== u.orgId) throw new Error('غير مصرح');
  if (editable && !['DATA_COLLECTION', 'INFO_REQUESTED'].includes(a.status)) throw new Error('لا يمكن تعديل الطلب في حالته الحالية');
  return { u, a };
}
const num = (v: FormDataEntryValue | null) => { const s = String(v ?? '').replace(/[,\s٬]/g, '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); return s ? Number(s) : null; };

// ---------------------------------------------------------------- بيانات الجهة
const Profile = z.object({
  name: z.string().min(3, 'اسم الجهة مطلوب'), licenseNo: z.string().min(1, 'رقم الترخيص مطلوب'), orgType: z.string().min(2, 'اختر نوع الجهة'),
  region: z.string().min(2, 'اختر المنطقة'), city: z.string().min(2, 'اكتب المدينة'), field: z.string().min(2, 'اختر المجال'),
  lastYearExpenses: z.number({ error: 'اكتب إجمالي المصروفات' }).positive('إجمالي المصروفات مطلوب'),
});
export async function saveOrgProfile(_: FormState, fd: FormData): Promise<FormState> {
  const u = await orgUser();
  const data = {
    name: String(fd.get('name') ?? '').trim(), nameEn: String(fd.get('nameEn') ?? '') || null, licenseNo: String(fd.get('licenseNo') ?? '').trim(), unifiedNo: String(fd.get('unifiedNo') ?? '') || null,
    orgType: String(fd.get('orgType') ?? ''), region: String(fd.get('region') ?? ''), city: String(fd.get('city') ?? '').trim(), field: String(fd.get('field') ?? ''),
    foundedYear: num(fd.get('foundedYear')), website: String(fd.get('website') ?? '') || null, email: String(fd.get('email') ?? '') || null, phone: String(fd.get('phone') ?? '') || null,
    address: String(fd.get('address') ?? '') || null, fiscalYearEnd: String(fd.get('fiscalYearEnd') ?? '12-31'), lastYearExpenses: num(fd.get('lastYearExpenses')), lastYearRevenue: num(fd.get('lastYearRevenue')),
    programExpenses: num(fd.get('programExpenses')), beneficiariesCount: num(fd.get('beneficiariesCount')), programsCount: num(fd.get('programsCount')), employeesCount: num(fd.get('employeesCount')),
    volunteersCount: num(fd.get('volunteersCount')), description: String(fd.get('description') ?? '') || null, contactName: String(fd.get('contactName') ?? '') || null, contactTitle: String(fd.get('contactTitle') ?? '') || null,
  };
  const p = Profile.safeParse(data);
  if (!p.success) return { error: p.error.issues[0].message, fields: Object.fromEntries([...fd.entries()].filter(([, x]) => typeof x === 'string').map(([k, x]) => [k, String(x)])) };
  await db.update(organizations).set({ ...data, track: trackOf(data.lastYearExpenses!), profileCompleted: true }).where(eq(organizations.id, u.orgId));
  revalidatePath('/portal');
  if (fd.get('then') === 'request') redirect('/portal/assessments/new');
  return { ok: 'حُفظت بيانات الجهة' };
}

// ---------------------------------------------------------------- طلب التقييم والدفع
export async function createAssessmentRequest() {
  const u = await orgUser();
  const org = u.org!;
  if (!org.profileCompleted) redirect('/portal/onboarding');
  const cycleYear = new Date().getFullYear() - 1;
  const open = (await db.select().from(assessments).where(and(eq(assessments.orgId, u.orgId), eq(assessments.cycleYear, cycleYear)))).find(a => a.status !== 'CANCELLED');
  if (open) {
    if (open.status === 'AWAITING_PAYMENT' || open.status === 'DRAFT') { const pay = await createPayment(u.orgId, open.id, 'CERTIFICATE'); redirect(`/portal/checkout/${pay.id}`); }
    redirect(`/portal/assessments/${open.id}`);
  }
  const id = createId(); const number = await nextNumber('KA');
  await db.insert(assessments).values({ id, number, orgId: u.orgId, cycleYear, status: 'AWAITING_PAYMENT', track: org.track, expenses: org.lastYearExpenses, managerId: org.accountManagerId });
  await logActivity('assessment.created', { assessmentId: id, userId: u.id, details: { number, cycleYear } });
  const pay = await createPayment(u.orgId, id, 'CERTIFICATE');
  redirect(`/portal/checkout/${pay.id}`);
}

async function ownPayment(paymentId: string) {
  const u = await orgUser();
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!pay || pay.orgId !== u.orgId) throw new Error('غير مصرح');
  return { u, pay };
}
export async function applyCouponAction(_: FormState, fd: FormData): Promise<FormState> {
  const { pay } = await ownPayment(String(fd.get('paymentId')));
  const code = String(fd.get('code') ?? '').trim();
  const r = await applyCoupon(pay.id, code || null);
  revalidatePath(`/portal/checkout/${pay.id}`);
  if ('error' in r && r.error) return { error: r.error };
  return { ok: code ? 'طُبق كود الخصم' : 'أُزيل كود الخصم' };
}
export async function checkoutAction(_: FormState, fd: FormData): Promise<FormState> {
  const { u, pay } = await ownPayment(String(fd.get('paymentId')));
  const gw = String(fd.get('gateway') ?? '');
  if (Number(pay.total) === 0) { await markPaid(pay.id, 'coupon', 'FREE', { note: 'خصم كامل' }, u.id); redirect(pay.product === 'CERTIFICATE' ? `/portal/assessments/${pay.assessmentId}?paid=1` : `/portal/assessments/${pay.assessmentId}/verification?paid=1`); }
  const r = await startCheckout(pay.id, gw, { name: u.name, email: u.email, phone: u.phone });
  if (r.type === 'redirect') redirect(r.url);
  if (r.type === 'bank') redirect(`/portal/checkout/${pay.id}?bank=1`);
  return { error: r.message };
}
export async function uploadReceipt(_: FormState, fd: FormData): Promise<FormState> {
  const { u, pay } = await ownPayment(String(fd.get('paymentId')));
  const file = fd.get('receipt') as File | null;
  if (!file || !file.size) return { error: 'أرفق صورة أو ملف إيصال التحويل' };
  const gws = await getGateways(true);
  if (!gws.some(g => g.id === 'bank_transfer')) return { error: 'التحويل البنكي غير مفعّل' };
  const saved = await saveFile(`receipts/${pay.orgId}`, file);
  await db.update(payments).set({ status: 'AWAITING_APPROVAL', gateway: 'bank_transfer', receiptPath: saved.storedPath }).where(eq(payments.id, pay.id));
  await notifyStaff('إيصال تحويل بنكي بانتظار الاعتماد', `${u.org?.name} — ${pay.number} — ${pay.total} ر.س`, '/admin/payments?status=AWAITING_APPROVAL');
  redirect(`/portal/payments?receipt=1`);
}
export async function sandboxPay(fd: FormData) {
  const { u, pay } = await ownPayment(String(fd.get('paymentId')));
  const sandbox = (await getGateways(true)).find(g => g.id === 'sandbox');
  if (!sandbox) throw new Error('البوابة التجريبية معطلة');
  if (fd.get('outcome') === 'fail') { await db.update(payments).set({ status: 'FAILED', gateway: 'sandbox' }).where(eq(payments.id, pay.id)); redirect(`/portal/checkout/${pay.id}?failed=1`); }
  await markPaid(pay.id, 'sandbox', 'sandbox_' + createId().slice(0, 10), { card: '4111 •••• 1111' }, u.id);
  redirect(pay.product === 'CERTIFICATE' ? `/portal/assessments/${pay.assessmentId}?paid=1` : `/portal/assessments/${pay.assessmentId}/verification?paid=1`);
}

// ---------------------------------------------------------------- الأسئلة
export async function saveAnswer(assessmentId: string, factorId: string, patch: { status?: 'NONE' | 'PARTIAL' | 'YES' | 'NA' | null; selfLevel?: number | null; answer?: string | null }) {
  await ownAssessment(assessmentId, true);
  const ex = (await db.select().from(answers).where(and(eq(answers.assessmentId, assessmentId), eq(answers.factorId, factorId))).limit(1))[0];
  if (ex) await db.update(answers).set(patch).where(eq(answers.id, ex.id));
  else await db.insert(answers).values({ assessmentId, factorId, ...patch });
  const p = await recomputeProgress(assessmentId);
  return { progress: p.progress, answered: p.answered };
}

// ---------------------------------------------------------------- الملفات والنواقص
export async function deleteDocument(docId: string) {
  const d = (await db.select().from(documents).where(eq(documents.id, docId)).limit(1))[0];
  if (!d) return;
  await ownAssessment(d.assessmentId, true);
  await db.delete(documents).where(eq(documents.id, docId));
  await recomputeProgress(d.assessmentId);
  revalidatePath(`/portal/assessments/${d.assessmentId}/documents`);
}
export async function runGapAnalysis(assessmentId: string) {
  await ownAssessment(assessmentId);
  const r = await analyzeGaps(assessmentId);
  revalidatePath(`/portal/assessments/${assessmentId}`, 'layout');
  return r;
}

export async function submitAssessment(assessmentId: string) {
  const { u, a } = await ownAssessment(assessmentId, true);
  const p = await recomputeProgress(assessmentId);
  if (p.missingDocs.length) return { error: `ارفع الملفات الأساسية أولاً: ${p.missingDocs.map(d => d.title).join('، ')}` };
  if (p.answered < Math.ceil(p.total * 0.7)) return { error: `أجب عن 70٪ من الأسئلة على الأقل (أجبت عن ${p.answered} من ${p.total})` };
  const resubmit = a.status === 'INFO_REQUESTED';
  await db.update(assessments).set({ status: resubmit ? 'UNDER_REVIEW' : 'SUBMITTED', submittedAt: a.submittedAt ?? new Date() }).where(eq(assessments.id, assessmentId));
  if (!resubmit) await proposeLevels(assessmentId);
  await logActivity(resubmit ? 'assessment.resubmitted' : 'assessment.submitted', { assessmentId, userId: u.id });
  if (resubmit) await notify([a.assessorId], 'ردّت الجهة على الاستيضاح', a.number, `/assessor/assessments/${assessmentId}`);
  else await notifyStaff('طلب تقييم جديد جاهز للإسناد', `${u.org?.name} — ${a.number}`, `/admin/assessments/${assessmentId}`);
  revalidatePath(`/portal/assessments/${assessmentId}`, 'layout');
  return { ok: true };
}

export async function respondInfoRequest(_: FormState, fd: FormData): Promise<FormState> {
  const id = String(fd.get('id')); const text = String(fd.get('response') ?? '').trim();
  const r = (await db.select().from(infoRequests).where(eq(infoRequests.id, id)).limit(1))[0];
  if (!r) return { error: 'الطلب غير موجود' };
  const { a } = await ownAssessment(r.assessmentId);
  if (!text) return { error: 'اكتب ردك' };
  await db.update(infoRequests).set({ response: text, status: 'ANSWERED', answeredAt: new Date() }).where(eq(infoRequests.id, id));
  const open = (await db.select().from(infoRequests).where(and(eq(infoRequests.assessmentId, a.id), eq(infoRequests.status, 'OPEN')))).length;
  if (!open && a.status === 'INFO_REQUESTED') { await db.update(assessments).set({ status: 'UNDER_REVIEW' }).where(eq(assessments.id, a.id)); await notify([a.assessorId], 'ردّت الجهة على كل الاستيضاحات', a.number, `/assessor/assessments/${a.id}`); }
  revalidatePath(`/portal/assessments/${a.id}`, 'layout');
  return { ok: 'أُرسل الرد' };
}

// ---------------------------------------------------------------- زيارة التحقق
export async function requestVisit(_: FormState, fd: FormData): Promise<FormState> {
  const { u, a } = await ownAssessment(String(fd.get('assessmentId')));
  if (!['DESK_COMPLETED', 'VERIFICATION'].includes(a.status)) return { error: 'تُطلب زيارة التحقق بعد صدور النتيجة غير الموثقة' };
  const ex = (await db.select().from(visits).where(eq(visits.assessmentId, a.id)).limit(1))[0];
  const data = { preferredDates: String(fd.get('preferredDates') ?? '') || null, location: String(fd.get('location') ?? '') || null };
  if (!ex) await db.insert(visits).values({ assessmentId: a.id, status: 'AWAITING_PAYMENT', ...data });
  else await db.update(visits).set(data).where(eq(visits.id, ex.id));
  const pay = await createPayment(u.orgId, a.id, 'VERIFICATION_VISIT');
  await logActivity('visit.requested', { assessmentId: a.id, userId: u.id });
  if (pay.status === 'PAID') redirect(`/portal/assessments/${a.id}/verification`);
  redirect(`/portal/checkout/${pay.id}`);
}

export async function markAllRead() {
  const u = await requireUser();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, u.id), isNull(notifications.readAt)));
  revalidatePath('/', 'layout');
}
export async function cancelPendingPayment(paymentId: string) {
  const { pay } = await ownPayment(paymentId);
  if (pay.status === 'FAILED') await db.update(payments).set({ status: 'PENDING' }).where(eq(payments.id, pay.id));
  revalidatePath(`/portal/checkout/${pay.id}`);
}
