'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { db, assessments, visits, certificates, payments, coupons, users, organizations, paymentGateways, documentRequirements, sessions } from '@/db';
import { addVisitEvent } from '@/lib/visits';
import { SOCIAL } from '@/lib/social';
import type { SocialProvider } from '@/lib/settings';
import { assertStaff, hashPassword, findUserByEmail } from '@/lib/auth';
import { setSetting, getSetting } from '@/lib/settings';
import { encrypt, decrypt } from '@/lib/crypto';
import { markPaid, GATEWAY_FIELDS } from '@/lib/payments';
import { completeVerification, getAssessment } from '@/lib/workflow';
import { notify, notifyOrg, logActivity } from '@/lib/notify';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import type { FormState } from './auth';
import type { AssessmentStatus } from '@/db/schema';

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const n = (fd: FormData, k: string) => { const v = s(fd, k).replace(/[,\s]/g, ''); return v === '' ? null : Number(v); };
const b = (fd: FormData, k: string) => fd.get(k) === 'on' || fd.get(k) === 'true';
const ok = (m: string): FormState => ({ ok: m });
const err = (m: string): FormState => ({ error: m });

// ---------------------------------------------------------------- الطلبات
/** مرحلة التقرير غير الموثق: المقيّم الأول والثاني ومدير الحساب، مع التحكم في ظهور بيانات المقيّم للجهة */
export async function assignAssessment(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('assessments.assign');
  const id = s(fd, 'assessmentId'); const a = await getAssessment(id);
  if (!a) return err('الطلب غير موجود');
  const assessorId = s(fd, 'assessorId') || null, secondAssessorId = s(fd, 'secondAssessorId') || null, managerId = s(fd, 'managerId') || null;
  const revealAssessor = b(fd, 'revealAssessor');
  if (assessorId && assessorId === secondAssessorId) return err('المقيّم الثاني يجب أن يختلف عن الأول');
  if (a.verifierId && (assessorId === a.verifierId || secondAssessorId === a.verifierId)) return err('خبير التحقق الميداني يجب ألا يكون هو المقيّم المكتبي نفسه حفاظاً على الاستقلالية');
  for (const x of [assessorId, secondAssessorId]) if (x) { const r = (await db.select().from(users).where(eq(users.id, x)).limit(1))[0]; if (!r || r.role !== 'ASSESSOR' || !r.active) return err('اختر مقيّمين فعّالين من فريق الخبراء'); }
  await db.update(assessments).set({ assessorId, secondAssessorId, managerId, revealAssessor }).where(eq(assessments.id, id));
  const newlyAssigned = [assessorId, secondAssessorId].filter(x => x && x !== a.assessorId && x !== a.secondAssessorId) as string[];
  if (newlyAssigned.length) {
    await notify(newlyAssigned, 'أُسند إليك طلب تقييم', a.number, `/assessor/assessments/${id}`);
    await logActivity('assessment.assigned', { assessmentId: id, userId: u.id, details: { assessorId, secondAssessorId, revealAssessor } });
    await notifyOrg(a.orgId, 'أُسند طلبكم إلى خبير مقيّم', revealAssessor ? 'تجدون بيانات التواصل في صفحة الطلب.' : 'يمكنكم مراسلته للاستفسار من صفحة المراسلة.', `/portal/assessments/${id}`);
  }
  if (a.revealAssessor !== revealAssessor) await logActivity('assessment.assigned', { assessmentId: id, userId: u.id, details: { revealAssessor } });
  revalidatePath(`/admin/assessments/${id}`); revalidatePath('/admin/assessments'); revalidatePath(`/portal/assessments/${id}`, 'layout');
  return ok('حُفظ إسناد مرحلة التقرير غير الموثق');
}

/** مرحلة التقرير الموثق: خبير التحقق الميداني (يتزامن مع مستشار الزيارة) وإظهار بياناته للجهة */
export async function assignVerifier(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('assessments.assign');
  const id = s(fd, 'assessmentId'); const a = await getAssessment(id);
  if (!a) return err('الطلب غير موجود');
  const verifierId = s(fd, 'verifierId') || null; const revealVerifier = b(fd, 'revealVerifier');
  if (verifierId) {
    const r = (await db.select().from(users).where(eq(users.id, verifierId)).limit(1))[0];
    if (!r || r.role !== 'ASSESSOR' || !r.isFieldVerifier || !r.active) return err('اختر خبير تحقق ميداني فعّالاً');
    if (verifierId === a.assessorId || verifierId === a.secondAssessorId) return err('خبير التحقق يجب ألا يكون المقيّم المكتبي نفسه حفاظاً على الاستقلالية');
  }
  await db.update(assessments).set({ verifierId, revealVerifier }).where(eq(assessments.id, id));
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, id)).limit(1))[0];
  if (v && !['COMPLETED', 'CANCELLED'].includes(v.status)) { await db.update(visits).set({ consultantId: verifierId }).where(eq(visits.id, v.id)); await addVisitEvent(v.id, 'assigned', { actor: u, data: { verifierId } }); }
  if (verifierId && verifierId !== a.verifierId) {
    await notify([verifierId], 'عُيّنت خبير تحقق لطلب', a.number, v ? `/assessor/visits/${v.id}` : `/assessor/assessments/${id}`);
    await notifyOrg(a.orgId, 'عُيّن خبير التحقق لطلبكم', revealVerifier ? 'تجدون بيانات التواصل في صفحة التوثيق.' : 'سيتواصل الفريق معكم لتحديد الموعد.', `/portal/assessments/${id}/verification`);
    await logActivity('assessment.verifier', { assessmentId: id, userId: u.id, details: { verifierId, revealVerifier } });
  }
  revalidatePath(`/admin/assessments/${id}`); revalidatePath('/admin/visits'); revalidatePath(`/portal/assessments/${id}`, 'layout');
  return ok('حُفظ إسناد مرحلة التقرير الموثق');
}
export async function setAssessmentStatus(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('assessments.manage');
  const id = s(fd, 'assessmentId'); const status = s(fd, 'status') as AssessmentStatus;
  const allowed: AssessmentStatus[] = ['DATA_COLLECTION', 'UNDER_REVIEW', 'CANCELLED'];
  if (!allowed.includes(status)) return err('حالة غير مسموحة');
  const a = await getAssessment(id);
  await db.update(assessments).set({ status }).where(eq(assessments.id, id));
  await logActivity('assessment.status', { assessmentId: id, userId: u.id, details: { from: a.status, to: status, note: s(fd, 'note') } });
  if (status === 'DATA_COLLECTION') await notifyOrg(a.orgId, 'أُعيد فتح طلبكم للتعديل', s(fd, 'note') || a.number, `/portal/assessments/${id}`);
  revalidatePath(`/admin/assessments/${id}`);
  return ok('حُدّثت الحالة');
}

// ---------------------------------------------------------------- الزيارات والشهادات
export async function scheduleVisit(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('visits.manage');
  const v = (await db.select().from(visits).where(eq(visits.id, s(fd, 'visitId'))).limit(1))[0];
  if (!v) return err('الزيارة غير موجودة');
  if (!['PAID', 'SCHEDULED'].includes(v.status)) return err('تُجدول الزيارة بعد دفع رسوم التوثيق، ولا تُعدّل بعد بدئها');
  const consultantId = s(fd, 'consultantId') || null; const when = s(fd, 'scheduledAt');
  if (!consultantId || !when) return err('اختر خبير التحقق والموعد');
  const scheduledAt = new Date(when + (when.length === 16 ? ':00+03:00' : ''));
  if (isNaN(scheduledAt.getTime())) return err('الموعد غير صحيح');
  if (scheduledAt.getTime() < Date.now() - 3600e3) return err('الموعد في الماضي');
  const c = (await db.select().from(users).where(eq(users.id, consultantId)).limit(1))[0];
  if (!c || !c.isFieldVerifier || !c.active) return err('اختر خبير تحقق ميداني فعّالاً');
  const a = await getAssessment(v.assessmentId);
  if (consultantId === a.assessorId || consultantId === a.secondAssessorId) return err('خبير التحقق يجب ألا يكون المقيّم المكتبي نفسه حفاظاً على الاستقلالية');
  // تضارب مواعيد الخبير: لا زيارتين في اليوم نفسه
  const day = scheduledAt.toISOString().slice(0, 10);
  const others = await db.select().from(visits).where(and(eq(visits.consultantId, consultantId), eq(visits.status, 'SCHEDULED')));
  const clash = others.find(o => o.id !== v.id && o.scheduledAt && new Date(o.scheduledAt.getTime() + 3 * 3600e3).toISOString().slice(0, 10) === new Date(scheduledAt.getTime() + 3 * 3600e3).toISOString().slice(0, 10));
  if (clash && fd.get('force') !== 'on') return err(`لدى الخبير زيارة أخرى في ${day}. فعّل «تجاوز تعارض المواعيد» إن كان مقصوداً.`);
  const reschedule = v.status === 'SCHEDULED' && v.scheduledAt && v.scheduledAt.getTime() !== scheduledAt.getTime();
  await db.update(visits).set({ consultantId, scheduledAt, location: s(fd, 'location') || v.location, siteContactName: s(fd, 'siteContactName') || v.siteContactName, siteContactPhone: s(fd, 'siteContactPhone') || v.siteContactPhone, status: 'SCHEDULED', orgConfirmedAt: reschedule || v.status === 'PAID' ? null : v.orgConfirmedAt, rescheduleCount: reschedule ? v.rescheduleCount + 1 : v.rescheduleCount }).where(eq(visits.id, v.id));
  await db.update(assessments).set({ verifierId: consultantId }).where(eq(assessments.id, a.id)); // يتزامن خبير التحقق مع مستشار الزيارة
  await addVisitEvent(v.id, reschedule ? 'rescheduled' : 'scheduled', { actor: u, note: s(fd, 'note') || null, data: { consultantId, scheduledAt: scheduledAt.toISOString() } });
  const dt = scheduledAt.toLocaleString('ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Riyadh' });
  await notifyOrg(a.orgId, reschedule ? 'عُدّل موعد زيارة التحقق' : 'تحدد موعد زيارة التحقق', `${dt} — يرجى تأكيد الموعد من صفحة التوثيق`, `/portal/assessments/${a.id}/verification`);
  await notify([consultantId], reschedule ? 'عُدّل موعد زيارة تحقق' : 'أُسندت إليك زيارة تحقق', `${a.number} — ${dt}`, `/assessor/visits/${v.id}`);
  await logActivity('visit.scheduled', { assessmentId: a.id, userId: u.id, details: { consultantId, scheduledAt: when, reschedule } });
  revalidatePath('/admin/visits'); revalidatePath(`/admin/assessments/${a.id}`); revalidatePath(`/portal/assessments/${a.id}`, 'layout');
  return ok(reschedule ? 'عُدّل الموعد وأُشعر الطرفان' : 'جُدولت الزيارة وأُشعر الطرفان');
}
/** إعادة الزيارة المجدولة إلى قائمة الجدولة (يبقى الدفع قائماً) */
export async function unscheduleVisit(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('visits.manage');
  const v = (await db.select().from(visits).where(eq(visits.id, s(fd, 'visitId'))).limit(1))[0];
  if (!v || v.status !== 'SCHEDULED') return err('الزيارة ليست مجدولة');
  const a = await getAssessment(v.assessmentId);
  await db.update(visits).set({ status: 'PAID', scheduledAt: null, orgConfirmedAt: null }).where(eq(visits.id, v.id));
  await addVisitEvent(v.id, 'unscheduled', { actor: u, note: s(fd, 'reason') || null });
  await notifyOrg(a.orgId, 'أُلغي موعد زيارة التحقق مؤقتاً', 'سيُحدد موعد جديد قريباً.', `/portal/assessments/${a.id}/verification`);
  revalidatePath('/admin/visits'); revalidatePath(`/admin/assessments/${a.id}`);
  return ok('أُعيدت الزيارة إلى قائمة الجدولة');
}
/** إلغاء الزيارة نهائياً (يُراجَع الاسترداد من المدفوعات) */
export async function cancelVisit(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('visits.manage');
  const v = (await db.select().from(visits).where(eq(visits.id, s(fd, 'visitId'))).limit(1))[0];
  const reason = s(fd, 'reason');
  if (!v || ['COMPLETED', 'CANCELLED'].includes(v.status)) return err('لا يمكن إلغاء هذه الزيارة');
  if (reason.length < 4) return err('اكتب سبب الإلغاء');
  const a = await getAssessment(v.assessmentId);
  await db.update(visits).set({ status: 'CANCELLED', scheduledAt: null }).where(eq(visits.id, v.id));
  await addVisitEvent(v.id, 'cancelled', { actor: u, note: reason });
  await notifyOrg(a.orgId, 'أُلغيت زيارة التحقق', reason, `/portal/assessments/${a.id}/verification`);
  await notify([v.consultantId], 'أُلغيت زيارة تحقق', `${a.number}: ${reason}`);
  await logActivity('visit.cancelled', { assessmentId: a.id, userId: u.id, details: { reason } });
  revalidatePath('/admin/visits'); revalidatePath(`/admin/assessments/${a.id}`);
  return ok('أُلغيت الزيارة. راجع المدفوعات لتسجيل الاسترداد عند الحاجة.');
}
export async function issueVerifiedCertificate(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('certificates.issue');
  try { const { num, r } = await completeVerification(s(fd, 'assessmentId'), u); revalidatePath(`/admin/assessments/${s(fd, 'assessmentId')}`); return ok(`صدرت الشهادة الموثقة ${num} — ${r.total}`); }
  catch (e) { return err((e as Error).message); }
}
export async function revokeCertificate(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('certificates.revoke');
  const reason = s(fd, 'reason'); if (reason.length < 4) return err('اكتب سبب الإلغاء');
  const c = (await db.select().from(certificates).where(eq(certificates.id, s(fd, 'id'))).limit(1))[0];
  if (!c) return err('غير موجودة');
  await db.update(certificates).set({ status: 'REVOKED', revokedReason: reason }).where(eq(certificates.id, c.id));
  await logActivity('certificate.revoked', { assessmentId: c.assessmentId, userId: u.id, details: { number: c.number, reason } });
  await notifyOrg(c.orgId, 'أُلغيت شهادة', `${c.number}: ${reason}`, '/portal/certificates');
  revalidatePath('/admin/certificates');
  return ok('أُلغيت الشهادة');
}

// ---------------------------------------------------------------- المدفوعات
export async function approvePayment(paymentId: string) {
  const u = await assertStaff('payments.approve');
  const p = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!p || !['AWAITING_APPROVAL', 'PENDING'].includes(p.status)) throw new Error('الدفعة غير قابلة للاعتماد');
  await markPaid(p.id, p.gateway ?? 'bank_transfer', `MANUAL-${p.number}`, { approvedBy: u.name, approvedAt: new Date().toISOString() }, u.id);
  await logActivity('payment.approved', { assessmentId: p.assessmentId, userId: u.id, details: { number: p.number } });
  revalidatePath('/admin/payments');
}
export async function rejectPayment(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('payments.approve');
  const p = (await db.select().from(payments).where(eq(payments.id, s(fd, 'paymentId'))).limit(1))[0];
  if (!p || p.status !== 'AWAITING_APPROVAL') return err('الدفعة ليست بانتظار الاعتماد');
  await db.update(payments).set({ status: 'PENDING', providerData: { ...(p.providerData ?? {}), rejected: s(fd, 'reason') } }).where(eq(payments.id, p.id));
  await notifyOrg(p.orgId, 'تعذر اعتماد إيصال التحويل', s(fd, 'reason') || 'يرجى مراجعة الإيصال وإعادة رفعه', `/portal/checkout/${p.id}?bank=1`);
  await logActivity('payment.rejected', { assessmentId: p.assessmentId, userId: u.id, details: { number: p.number, reason: s(fd, 'reason') } });
  revalidatePath('/admin/payments');
  return ok('أُعيدت الدفعة للجهة مع السبب');
}
export async function refundPayment(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('payments.refund');
  const p = (await db.select().from(payments).where(eq(payments.id, s(fd, 'paymentId'))).limit(1))[0];
  if (!p || p.status !== 'PAID') return err('تُسترد الدفعات المكتملة فقط');
  await db.update(payments).set({ status: 'REFUNDED', providerData: { ...(p.providerData ?? {}), refund: { by: u.name, at: new Date().toISOString(), note: s(fd, 'note') } } }).where(eq(payments.id, p.id));
  await logActivity('payment.refunded', { assessmentId: p.assessmentId, userId: u.id, details: { number: p.number } });
  revalidatePath('/admin/payments');
  return ok('سُجّل الاسترداد. نفّذ الاسترداد المالي من لوحة البوابة إن كانت الدفعة إلكترونية.');
}

// ---------------------------------------------------------------- أكواد الخصم
export async function saveCoupon(_: FormState, fd: FormData): Promise<FormState> {
  await assertStaff('coupons.manage');
  const id = s(fd, 'id'); const code = s(fd, 'code').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,40}$/.test(code)) return err('الكود: 3 أحرف لاتينية أو أرقام على الأقل');
  const type = s(fd, 'type') === 'FIXED' ? 'FIXED' : 'PERCENT'; const value = n(fd, 'value') ?? 0;
  if (value <= 0 || (type === 'PERCENT' && value > 100)) return err('قيمة الخصم غير صحيحة');
  const data = { code, type: type as 'FIXED' | 'PERCENT', value, product: s(fd, 'product') || 'ALL', maxUses: n(fd, 'maxUses'), expiresAt: s(fd, 'expiresAt') ? new Date(s(fd, 'expiresAt') + 'T23:59:59') : null, active: b(fd, 'active'), note: s(fd, 'note') || null };
  const dup = (await db.select().from(coupons).where(eq(coupons.code, code)).limit(1))[0];
  if (dup && dup.id !== id) return err('الكود مستخدم');
  if (id) await db.update(coupons).set(data).where(eq(coupons.id, id)); else await db.insert(coupons).values(data);
  revalidatePath('/admin/coupons');
  return ok(id ? 'حُدّث الكود' : 'أُنشئ الكود وأصبح فعّالاً في صفحة الدفع');
}
export async function toggleCoupon(id: string) {
  await assertStaff('coupons.manage');
  const c = (await db.select().from(coupons).where(eq(coupons.id, id)).limit(1))[0];
  if (c) await db.update(coupons).set({ active: !c.active }).where(eq(coupons.id, id));
  revalidatePath('/admin/coupons');
}

// ---------------------------------------------------------------- المستخدمون
export async function saveUser(_: FormState, fd: FormData): Promise<FormState> {
  const me = await assertStaff('users.manage');
  const id = s(fd, 'id'); const email = s(fd, 'email').toLowerCase(); const role = s(fd, 'role') as 'SUPER_ADMIN' | 'ACCOUNT_MANAGER' | 'ASSESSOR';
  if (!['SUPER_ADMIN', 'ACCOUNT_MANAGER', 'ASSESSOR'].includes(role)) return err('اختر الدور');
  if (me.role !== 'SUPER_ADMIN' && role !== 'ASSESSOR') return err('مدير الحساب يضيف المقيّمين فقط؛ إدارة المديرين للأدمن');
  if (me.role !== 'SUPER_ADMIN' && id) { const t = (await db.select().from(users).where(eq(users.id, id)).limit(1))[0]; if (t && t.role !== 'ASSESSOR') return err('غير مصرح بتعديل هذا الحساب'); }
  if (!/^\S+@\S+\.\S+$/.test(email)) return err('البريد غير صحيح');
  const name = s(fd, 'name'); if (name.length < 3) return err('الاسم مطلوب');
  const perms = role === 'ACCOUNT_MANAGER' ? ALL_PERMISSIONS.filter(p => fd.get('perm_' + p) === 'on') : null;
  const data = { name, email, phone: s(fd, 'phone') || null, role, permissions: perms, isFieldVerifier: role === 'ASSESSOR' && b(fd, 'isFieldVerifier'), specialties: s(fd, 'specialties') || null, active: b(fd, 'active') };
  const dup = await findUserByEmail(email);
  if (dup && dup.id !== id) return err('البريد مستخدم لحساب آخر');
  const pw = s(fd, 'password');
  if (id) {
    if (id === me.id && !data.active) return err('لا يمكنك تعطيل حسابك');
    await db.update(users).set({ ...data, ...(pw ? { passwordHash: await hashPassword(pw) } : {}) }).where(eq(users.id, id));
    if (!data.active) await db.delete(sessions).where(eq(sessions.userId, id));
  } else {
    if (pw.length < 8) return err('كلمة المرور 8 أحرف على الأقل');
    await db.insert(users).values({ ...data, passwordHash: await hashPassword(pw) });
  }
  await logActivity(id ? 'user.updated' : 'user.created', { userId: me.id, details: { email, role } });
  revalidatePath('/admin/users');
  if (!id) redirect('/admin/users?created=1');
  return ok('حُفظ المستخدم');
}

// ---------------------------------------------------------------- الجهات
export async function saveOrgAdmin(_: FormState, fd: FormData): Promise<FormState> {
  await assertStaff('orgs.manage');
  const id = s(fd, 'id');
  await db.update(organizations).set({ accountManagerId: s(fd, 'accountManagerId') || null }).where(eq(organizations.id, id));
  revalidatePath(`/admin/organizations/${id}`);
  return ok('حُفظ');
}

/** توثيق الجهة: يتحقق الموظف من مطابقة البيانات للمستندات ثم يعتمد أو يعيد للتصحيح */
export async function verifyOrg(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('orgs.verify');
  const id = s(fd, 'orgId'); const o = (await db.select().from(organizations).where(eq(organizations.id, id)).limit(1))[0];
  if (!o) return err('الجهة غير موجودة');
  if (!o.profileCompleted) return err('بيانات الجهة أو مستنداتها الأساسية غير مكتملة؛ لا يمكن توثيقها.');
  if (fd.get('matched') !== 'on') return err('أكّد أنك طابقت بيانات الجهة مع المستندات المرفوعة (الترخيص ورقمه وجهة الإصدار).');
  await db.update(organizations).set({ verificationStatus: 'VERIFIED', verifiedAt: new Date(), verifiedById: u.id, verificationNote: s(fd, 'note') || null }).where(eq(organizations.id, id));
  await logActivity('org.verified', { userId: u.id, details: { orgId: id, name: o.name } });
  await notifyOrg(id, 'وُثّق حساب جهتكم', 'يمكنكم الآن طلب التوثيق الميداني والتقرير التعقيبي بعد صدور النتيجة.', '/portal/onboarding');
  revalidatePath(`/admin/organizations/${id}`); revalidatePath('/admin/organizations'); revalidatePath('/portal', 'layout');
  return ok('وُثّقت الجهة وأُشعر أعضاؤها');
}
export async function rejectOrg(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('orgs.verify');
  const id = s(fd, 'orgId'); const note = s(fd, 'note');
  if (note.length < 6) return err('اكتب ملاحظات التصحيح التي ستصل الجهة');
  const o = (await db.select().from(organizations).where(eq(organizations.id, id)).limit(1))[0];
  if (!o) return err('الجهة غير موجودة');
  await db.update(organizations).set({ verificationStatus: 'REJECTED', verificationNote: note, verifiedAt: null, verifiedById: null }).where(eq(organizations.id, id));
  await logActivity('org.rejected', { userId: u.id, details: { orgId: id, note } });
  await notifyOrg(id, 'مطلوب تصحيح بيانات جهتكم قبل التوثيق', note, '/portal/onboarding');
  revalidatePath(`/admin/organizations/${id}`); revalidatePath('/admin/organizations'); revalidatePath('/portal', 'layout');
  return ok('أُعيدت الجهة للتصحيح مع الملاحظات');
}

// ---------------------------------------------------------------- الإعدادات
export async function savePricing(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('settings.pricing');
  const certificate = n(fd, 'certificate'), visit = n(fd, 'visit'), vatRate = n(fd, 'vatRate');
  if (!certificate || certificate < 0 || !visit || visit < 0) return err('الأسعار غير صحيحة');
  if (vatRate != null && (vatRate < 0 || vatRate > 50)) return err('نسبة الضريبة غير صحيحة');
  const before = await getSetting('pricing');
  const after = await setSetting('pricing', { certificate, visit, vatRate: vatRate ?? 15, pricesIncludeVat: b(fd, 'pricesIncludeVat') });
  if (before.certificate !== after.certificate || before.visit !== after.visit || before.vatRate !== after.vatRate || before.pricesIncludeVat !== after.pricesIncludeVat) await logActivity('settings.pricing', { userId: u.id, details: { before: { certificate: before.certificate, visit: before.visit, vatRate: before.vatRate, incl: before.pricesIncludeVat }, after: { certificate: after.certificate, visit: after.visit, vatRate: after.vatRate, incl: after.pricesIncludeVat } } });
  await setSetting('seller', { name: s(fd, 'sellerName'), vatNumber: s(fd, 'vatNumber'), crNumber: s(fd, 'crNumber'), address: s(fd, 'address'), email: s(fd, 'sellerEmail'), phone: s(fd, 'sellerPhone') });
  await setSetting('bank', { bankName: s(fd, 'bankName'), accountName: s(fd, 'accountName'), iban: s(fd, 'iban').replace(/\s/g, '').toUpperCase(), note: s(fd, 'bankNote') });
  await setSetting('general', { platformName: s(fd, 'platformName') || 'منصة كفاءة الأثر', supportEmail: s(fd, 'supportEmail'), supportPhone: s(fd, 'supportPhone'), visitSampleSize: n(fd, 'visitSampleSize') ?? 20 });
  revalidatePath('/', 'layout');
  return ok('حُفظت الإعدادات، وتنعكس الأسعار على الطلبات الجديدة فوراً');
}

/** حفظ مفاتيح بوابة الدفع مشفرة — تنعكس على صفحة الدفع مباشرة */
export async function saveGateway(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('settings.gateways');
  const id = s(fd, 'id');
  const g = (await db.select().from(paymentGateways).where(eq(paymentGateways.id, id)).limit(1))[0];
  if (!g) return err('بوابة غير معروفة');
  const cur = g.config ?? {}; const next: Record<string, string> = { ...cur };
  for (const f of GATEWAY_FIELDS[id] ?? []) {
    const v = s(fd, f.key);
    if (f.secret) { if (v && !v.includes('••')) next[f.key] = encrypt(v); }
    else next[f.key] = v;
  }
  const enabled = b(fd, 'enabled'); const mode = s(fd, 'mode') === 'LIVE' ? 'LIVE' : 'TEST';
  if (enabled && id === 'moyasar' && (!next.secretKey || !next.publishableKey)) return err('أدخل المفتاح العام والسري لميسر قبل التفعيل');
  if (enabled && id === 'tap' && !next.secretKey) return err('أدخل المفتاح السري لتاب قبل التفعيل');
  const sk = decrypt(next.secretKey);
  if (mode === 'LIVE' && sk && sk.includes('_test_')) return err('مفتاح اختبار مع وضع الإنتاج: استخدم مفتاح sk_live_');
  await db.update(paymentGateways).set({ enabled, mode, config: next }).where(eq(paymentGateways.id, id));
  await logActivity('settings.gateway', { userId: u.id, details: { id, enabled, mode } });
  revalidatePath('/admin/settings/gateways');
  return ok(enabled ? 'حُفظت البوابة وأصبحت متاحة في صفحة الدفع فوراً' : 'حُفظت البوابة (معطّلة)');
}

export async function saveAi(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('settings.ai');
  const cur = await getSetting('ai'); const key = s(fd, 'apiKey');
  await setSetting('ai', { enabled: b(fd, 'enabled'), model: s(fd, 'model') || cur.model, maxFileMb: n(fd, 'maxFileMb') ?? 20, autoAnalyze: b(fd, 'autoAnalyze'), apiKey: key && !key.includes('••') ? encrypt(key) : cur.apiKey });
  await logActivity('settings.ai', { userId: u.id });
  revalidatePath('/admin/settings/ai');
  return ok('حُفظت إعدادات Claude');
}
export async function testAi(_?: FormState, __?: FormData): Promise<FormState> {
  await assertStaff('settings.ai');
  const c = await getSetting('ai'); const apiKey = decrypt(c.apiKey) || process.env.ANTHROPIC_API_KEY || '';
  if (!apiKey) return err('لا يوجد مفتاح API محفوظ');
  try {
    const m = await new Anthropic({ apiKey }).messages.create({ model: c.model, max_tokens: 40, messages: [{ role: 'user', content: 'اكتب كلمة واحدة: جاهز' }] });
    const t = m.content.find(x => x.type === 'text');
    return ok(`الاتصال ناجح بالنموذج ${m.model}: «${t && 'text' in t ? t.text.trim() : ''}»`);
  } catch (e) { return err('تعذر الاتصال: ' + (e as Error).message); }
}

/** مفاتيح الدخول عبر Google وFacebook وLinkedIn (السر يُخزَّن مشفراً) */
export async function saveSocial(_: FormState, fd: FormData): Promise<FormState> {
  const u = await assertStaff('settings.social');
  const cur = await getSetting('social');
  const next = {} as Record<SocialProvider, { enabled: boolean; clientId: string; clientSecret: string }>;
  for (const p of ['google', 'facebook', 'linkedin'] as const) {
    const secret = s(fd, p + '_secret'); const clientId = s(fd, p + '_id'); const enabled = b(fd, p + '_enabled');
    const clientSecret = secret && !secret.includes('••') ? encrypt(secret) : cur[p].clientSecret;
    if (enabled && (!clientId || !clientSecret)) return err(`أدخل معرّف العميل والسر لـ ${SOCIAL[p].name} قبل التفعيل`);
    next[p] = { enabled, clientId, clientSecret };
  }
  await setSetting('social', next);
  await logActivity('settings.social', { userId: u.id, details: { google: next.google.enabled, facebook: next.facebook.enabled, linkedin: next.linkedin.enabled } });
  revalidatePath('/admin/settings/social'); revalidatePath('/login'); revalidatePath('/register');
  return ok('حُفظت إعدادات الدخول الاجتماعي');
}

export async function saveRequirement(_: FormState, fd: FormData): Promise<FormState> {
  await assertStaff('settings.requirements');
  const id = s(fd, 'id'); const code = s(fd, 'code').toUpperCase();
  if (!/^[A-Z0-9_]{3,40}$/.test(code)) return err('الرمز بالإنجليزية الكبيرة والشرطة السفلية');
  const tracks = (['EMERGING', 'MEDIUM', 'LARGE'] as const).filter(t => fd.get('t_' + t) === 'on');
  if (!tracks.length) return err('اختر مساراً واحداً على الأقل');
  const factorIds = s(fd, 'factorIds').toUpperCase().split(/[\s,،]+/).filter(x => /^F\d{3}$/.test(x));
  const data = { code, title: s(fd, 'title'), description: s(fd, 'description') || null, required: b(fd, 'required'), tracks: [...tracks], factorIds, category: s(fd, 'category') || 'عام', sortOrder: n(fd, 'sortOrder') ?? 99, active: b(fd, 'active') };
  if (data.title.length < 3) return err('العنوان مطلوب');
  const dup = (await db.select().from(documentRequirements).where(eq(documentRequirements.code, code)).limit(1))[0];
  if (dup && dup.id !== id) return err('الرمز مستخدم');
  if (id) await db.update(documentRequirements).set(data).where(eq(documentRequirements.id, id)); else await db.insert(documentRequirements).values(data);
  revalidatePath('/admin/settings/requirements');
  return ok('حُفظ المتطلب ويظهر للجهات فوراً');
}

export async function markNotificationsRead() { /* reserved */ }
