'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { createId } from '@paralleldrive/cuid2';
import { db, organizations, organizationMembers, orgDocuments, assessments, answers, documents, payments, infoRequests, visits, notifications, users } from '@/db';
import { requireUser, ownsOrg } from '@/lib/auth';
import { syncOrgReadiness, loadReadiness } from '@/lib/org';
import { trackOf } from '@/lib/scoring';
import { nextNumber } from '@/lib/settings';
import { createPayment, applyCoupon, startCheckout, markPaid, getGateways } from '@/lib/payments';
import { recomputeProgress, getAssessment } from '@/lib/workflow';
import { proposeLevels } from '@/lib/ai';
import { notifyStaff, notify, logActivity } from '@/lib/notify';
import { saveFile } from '@/lib/storage';
import { addVisitEvent } from '@/lib/visits';
import type { FormState } from './auth';

async function orgUser() {
  const u = await requireUser(['ORG_USER']);
  if (!u.orgId) throw new Error('أضف جهتك أولاً');
  return u as typeof u & { orgId: string };
}
/** الحساب الواحد قد يدير عدة جهات: الصلاحية بالعضوية لا بالجهة النشطة */
async function ownAssessment(id: string, editable = false) {
  const u = await requireUser(['ORG_USER']);
  const a = await getAssessment(id);
  if (!a || !ownsOrg(u, a.orgId)) throw new Error('غير مصرح');
  if (editable && !['DATA_COLLECTION', 'INFO_REQUESTED'].includes(a.status)) throw new Error('لا يمكن تعديل الطلب في حالته الحالية');
  return { u, a };
}
const orgName = async (id: string) => (await db.select({ n: organizations.name }).from(organizations).where(eq(organizations.id, id)).limit(1))[0]?.n ?? '';
const num = (v: FormDataEntryValue | null) => { const s = String(v ?? '').replace(/[,\s٬]/g, '').replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))); return s ? Number(s) : null; };

// ---------------------------------------------------------------- بيانات الجهة
const Profile = z.object({
  name: z.string().min(3, 'اسم الجهة مطلوب'), licenseNo: z.string().min(1, 'رقم الترخيص مطلوب'), orgType: z.string().min(2, 'اختر نوع الجهة'),
  region: z.string().min(2, 'اختر المنطقة'), city: z.string().min(2, 'اكتب المدينة'), field: z.string().min(2, 'اختر المجال'),
});
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const date = (fd: FormData, k: string) => { const v = str(fd, k); const d = v ? new Date(v + 'T00:00:00Z') : null; return d && !isNaN(d.getTime()) ? d : null; };
const echo = (fd: FormData) => Object.fromEntries([...fd.entries()].filter(([, x]) => typeof x === 'string').map(([k, x]) => [k, String(x)]));

/** إنشاء جهة جديدة (orgId فارغ) أو تعديل جهة يملكها الحساب. تُحفظ البيانات دائماً، أما اكتمالها فيحدده فحص الجاهزية. */
export async function saveOrgProfile(_: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser(['ORG_USER']);
  const orgId = str(fd, 'orgId');
  if (orgId && !ownsOrg(u, orgId)) return { error: 'غير مصرح بتعديل هذه الجهة' };
  const data = {
    name: str(fd, 'name'), nameEn: str(fd, 'nameEn') || null, licenseNo: str(fd, 'licenseNo'), unifiedNo: str(fd, 'unifiedNo') || null,
    orgType: str(fd, 'orgType'), region: str(fd, 'region'), city: str(fd, 'city'), field: str(fd, 'field'),
    licenseIssuer: str(fd, 'licenseIssuer') || null, licenseIssueDate: date(fd, 'licenseIssueDate'), licenseExpiry: date(fd, 'licenseExpiry'),
    foundedYear: num(fd.get('foundedYear')), website: str(fd, 'website') || null, email: str(fd, 'email') || null, phone: str(fd, 'phone') || null,
    address: str(fd, 'address') || null, nationalAddress: str(fd, 'nationalAddress').toUpperCase() || null,
    repName: str(fd, 'repName') || null, repTitle: str(fd, 'repTitle') || null, repPhone: str(fd, 'repPhone') || null, repEmail: str(fd, 'repEmail') || null,
    fiscalYearEnd: str(fd, 'fiscalYearEnd') || '12-31', lastYearExpenses: num(fd.get('lastYearExpenses')), lastYearRevenue: num(fd.get('lastYearRevenue')),
    programExpenses: num(fd.get('programExpenses')), beneficiariesCount: num(fd.get('beneficiariesCount')), programsCount: num(fd.get('programsCount')), employeesCount: num(fd.get('employeesCount')),
    volunteersCount: num(fd.get('volunteersCount')), description: str(fd, 'description') || null, contactName: str(fd, 'contactName') || null, contactTitle: str(fd, 'contactTitle') || null,
  };
  const p = Profile.safeParse(data);
  if (!p.success) return { error: p.error.issues[0].message, fields: echo(fd) };
  if (data.nationalAddress && !/^[A-Z]{4}\d{4}$/.test(data.nationalAddress)) return { error: 'العنوان الوطني المختصر 4 أحرف و4 أرقام (مثال: RRRD2929)', fields: echo(fd) };
  if (data.licenseIssueDate && data.licenseExpiry && data.licenseExpiry < data.licenseIssueDate) return { error: 'تاريخ انتهاء الترخيص قبل تاريخ إصداره', fields: echo(fd) };
  const track = data.lastYearExpenses ? trackOf(data.lastYearExpenses) : null;
  let id = orgId; let resetVerified = false;
  if (orgId) {
    const cur = (await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1))[0];
    // تغيير الاسم أو رقم الترخيص أو جهة الترخيص بعد التوثيق يستلزم إعادة التوثيق
    resetVerified = cur.verificationStatus === 'VERIFIED' && (cur.name !== data.name || cur.licenseNo !== data.licenseNo || cur.licenseIssuer !== data.licenseIssuer);
    await db.update(organizations).set({ ...data, track }).where(eq(organizations.id, orgId));
  } else {
    id = createId();
    await db.insert(organizations).values({ id, ...data, track, createdById: u.id });
    await db.insert(organizationMembers).values({ orgId: id, userId: u.id, role: 'OWNER' });
    await db.update(users).set({ orgId: id }).where(eq(users.id, u.id)); // تصبح الجهة النشطة
    await logActivity('org.created', { userId: u.id, details: { orgId: id, name: data.name } });
  }
  const r = await syncOrgReadiness(id, { userId: u.id, resetVerified });
  revalidatePath('/portal', 'layout');
  if (!orgId) redirect(`/portal/onboarding?org=${id}&saved=1#docs`);
  if (fd.get('then') === 'request' && r?.complete) redirect('/portal/assessments/new');
  return { ok: r?.complete ? 'حُفظت بيانات الجهة، وهي مكتملة.' : 'حُفظت البيانات. استكمل المستندات المطلوبة لتتمكن من تقديم الطلب.' };
}

/** تبديل الجهة النشطة (حساب واحد لعدة جهات) */
export async function switchOrg(orgId: string) {
  const u = await requireUser(['ORG_USER']);
  if (!ownsOrg(u, orgId)) throw new Error('غير مصرح');
  await db.update(users).set({ orgId }).where(eq(users.id, u.id));
  revalidatePath('/portal', 'layout');
  redirect('/portal');
}

export async function deleteOrgDoc(docId: string) {
  const u = await requireUser(['ORG_USER']);
  const d = (await db.select().from(orgDocuments).where(eq(orgDocuments.id, docId)).limit(1))[0];
  if (!d || !ownsOrg(u, d.orgId)) throw new Error('غير مصرح');
  await db.delete(orgDocuments).where(eq(orgDocuments.id, docId));
  await syncOrgReadiness(d.orgId, { userId: u.id });
  revalidatePath('/portal/onboarding');
}

// ---------------------------------------------------------------- طلب التقييم والدفع
export async function createAssessmentRequest() {
  const u = await orgUser();
  const org = u.org!;
  // قبل التقديم: بيانات الجهة ورقم الترخيص والمستندات الأساسية لازمة (ولا يلزم انتظار موافقة الإدارة)
  const ready = await loadReadiness(u.orgId);
  if (!ready?.complete) redirect(`/portal/onboarding?org=${u.orgId}&need=1#docs`);
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
  if (!pay || !ownsOrg(u, pay.orgId)) throw new Error('غير مصرح');
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
  await notifyStaff('إيصال تحويل بنكي بانتظار الاعتماد', `${await orgName(pay.orgId)} — ${pay.number} — ${pay.total} ر.س`, '/admin/payments?status=AWAITING_APPROVAL');
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
  else await notifyStaff('طلب تقييم جديد جاهز للإسناد', `${await orgName(a.orgId)} — ${a.number}`, `/admin/assessments/${assessmentId}`);
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
  if (!['DESK_COMPLETED', 'VERIFICATION'].includes(a.status)) return { error: 'يُطلب التوثيق بعد صدور نتيجة التقييم غير الموثقة' };
  // التوثيق يستلزم أن تكون الجهة نفسها موثقة (مطابقة بياناتها ومستنداتها)
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  if (org.verificationStatus !== 'VERIFIED') return { error: 'يلزم توثيق حساب الجهة أولاً قبل طلب التوثيق الميداني. تراجع الإدارة بياناتك ومستنداتك وتُشعرك بالنتيجة.' };
  const ex = (await db.select().from(visits).where(eq(visits.assessmentId, a.id)).limit(1))[0];
  const data = { preferredDates: String(fd.get('preferredDates') ?? '') || null, location: String(fd.get('location') ?? '') || null, siteContactName: String(fd.get('siteContactName') ?? '').trim() || null, siteContactPhone: String(fd.get('siteContactPhone') ?? '').trim() || null };
  let visitId = ex?.id;
  if (!ex) { const [r] = await db.insert(visits).values({ assessmentId: a.id, status: 'AWAITING_PAYMENT', ...data }).$returningId(); visitId = r.id; await addVisitEvent(visitId, 'requested', { actor: u, note: data.preferredDates }); }
  else await db.update(visits).set(data).where(eq(visits.id, ex.id));
  const pay = await createPayment(a.orgId, a.id, 'VERIFICATION_VISIT');
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

/** تأكيد الجهة لموعد الزيارة المجدول */
export async function confirmVisit(_: FormState, fd: FormData): Promise<FormState> {
  const { u, a } = await ownAssessment(String(fd.get('assessmentId')));
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, a.id)).limit(1))[0];
  if (!v || v.status !== 'SCHEDULED' || !v.scheduledAt) return { error: 'لا يوجد موعد مجدول لتأكيده' };
  await db.update(visits).set({ orgConfirmedAt: new Date() }).where(eq(visits.id, v.id));
  await addVisitEvent(v.id, 'confirmed', { actor: u });
  await notify([v.consultantId, a.managerId], 'أكدت الجهة موعد زيارة التحقق', a.number, `/assessor/visits/${v.id}`);
  await logActivity('visit.confirmed', { assessmentId: a.id, userId: u.id });
  revalidatePath(`/portal/assessments/${a.id}/verification`);
  return { ok: 'تم تأكيد الموعد' };
}
/** اقتراح مواعيد بديلة أو تحديث بيانات من يستقبل الخبير */
export async function proposeVisitDates(_: FormState, fd: FormData): Promise<FormState> {
  const { u, a } = await ownAssessment(String(fd.get('assessmentId')));
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, a.id)).limit(1))[0];
  if (!v || ['COMPLETED', 'CANCELLED'].includes(v.status)) return { error: 'لا يمكن تعديل هذه الزيارة' };
  const preferredDates = String(fd.get('preferredDates') ?? '').trim();
  const siteContactName = String(fd.get('siteContactName') ?? '').trim() || null; const siteContactPhone = String(fd.get('siteContactPhone') ?? '').trim() || null;
  if (!preferredDates && !siteContactName) return { error: 'اكتب المواعيد المقترحة أو بيانات من يستقبل الخبير' };
  await db.update(visits).set({ preferredDates: preferredDates || v.preferredDates, siteContactName, siteContactPhone, orgConfirmedAt: null }).where(eq(visits.id, v.id));
  await addVisitEvent(v.id, 'proposed', { actor: u, note: preferredDates || null });
  await notifyStaff('الجهة اقترحت مواعيد لزيارة التحقق', `${a.number}${preferredDates ? ' — ' + preferredDates : ''}`, `/admin/visits?focus=${v.id}`, [v.consultantId]);
  revalidatePath(`/portal/assessments/${a.id}/verification`);
  return { ok: 'أُرسلت المقترحات للفريق وستصلك مواعيد مؤكدة' };
}
