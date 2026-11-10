import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db, assessments, answers, documents, documentRequirements, factorReviews, certificates, visits, factors, organizations } from '@/db';
import { evaluate, snapshot, FACTOR_IDS, type Levels } from './scoring';
import { nextNumber } from './settings';
import { randomCode } from './crypto';
import { notifyOrg, notifyStaff, notify, logActivity } from './notify';
import type { SessionUser } from './auth';
import { can } from './auth';

export async function getAssessment(id: string) {
  return (await db.select().from(assessments).where(eq(assessments.id, id)).limit(1))[0];
}

/** من يحق له الوصول إلى طلب تقييم */
export function canAccess(u: SessionUser, a: typeof assessments.$inferSelect) {
  if (u.role === 'SUPER_ADMIN') return true;
  if (u.role === 'ACCOUNT_MANAGER') return can(u, 'assessments.view');
  if (u.role === 'ASSESSOR') return a.assessorId === u.id || a.secondAssessorId === u.id || a.verifierId === u.id;
  return u.orgIds.includes(a.orgId);
}

export async function requiredDocs(track: string) {
  const rs = await db.select().from(documentRequirements).where(eq(documentRequirements.active, true));
  return rs.filter(r => (r.tracks as string[]).includes(track)).sort((a, b) => a.sortOrder - b.sortOrder);
}

/** نسبة الاكتمال: 60٪ للإجابات و40٪ للملفات الأساسية */
export async function recomputeProgress(assessmentId: string) {
  const a = await getAssessment(assessmentId);
  const ans = await db.select().from(answers).where(eq(answers.assessmentId, assessmentId));
  const answered = ans.filter(x => x.status).length;
  const reqs = (await requiredDocs(a.track ?? 'EMERGING')).filter(r => r.required);
  const docs = await db.select({ r: documents.requirementId }).from(documents).where(eq(documents.assessmentId, assessmentId));
  const have = new Set(docs.map(d => d.r));
  const docPct = reqs.length ? reqs.filter(r => have.has(r.id)).length / reqs.length : 1;
  const progress = Math.round((answered / FACTOR_IDS.length) * 60 + docPct * 40);
  await db.update(assessments).set({ progress }).where(eq(assessments.id, assessmentId));
  return { progress, answered, total: FACTOR_IDS.length, docsDone: reqs.filter(r => have.has(r.id)).length, docsTotal: reqs.length, missingDocs: reqs.filter(r => !have.has(r.id)) };
}

export async function levelsOf(assessmentId: string, phase: 'DESK' | 'VERIFIED' = 'DESK'): Promise<Levels> {
  const rs = await db.select().from(factorReviews).where(and(eq(factorReviews.assessmentId, assessmentId), eq(factorReviews.phase, phase)));
  const L: Levels = {};
  for (const r of rs) if (r.level != null) L[r.factorId] = r.level;
  return L;
}

export async function scoreOf(assessmentId: string, phase: 'DESK' | 'VERIFIED' = 'DESK') {
  const a = await getAssessment(assessmentId);
  return evaluate(await levelsOf(assessmentId, phase), Number(a.expenses ?? 0));
}

/** نهاية السنة الحالية: الشهادة تغطي السنة المالية الماضية وتسري حتى 31 ديسمبر من السنة التالية لها */
export const validUntilFor = (cycleYear: number) => new Date(Date.UTC(cycleYear + 1, 11, 31, 20, 59, 59));

async function issueCertificate(a: typeof assessments.$inferSelect, type: 'UNVERIFIED' | 'VERIFIED', snap: ReturnType<typeof snapshot>) {
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  // إلغاء أي إفادة سابقة من النوع نفسه لنفس الطلب
  await db.update(certificates).set({ status: 'REVOKED', revokedReason: 'استُبدلت بإصدار أحدث' }).where(and(eq(certificates.assessmentId, a.id), eq(certificates.type, type), eq(certificates.status, 'ACTIVE')));
  const number = await nextNumber(type === 'VERIFIED' ? 'KAC' : 'KAU');
  await db.insert(certificates).values({ number, assessmentId: a.id, orgId: a.orgId, type, score: snap.total, level: snap.status === 'مؤهل' ? snap.level : 'قيد التأهيل', coverage: a.coverage,
    periodYear: a.cycleYear, validUntil: validUntilFor(a.cycleYear), verifyCode: randomCode(10), snapshot: { ...snap, orgName: org.name, orgCity: org.city, field: org.field, assessmentNumber: a.number } });
  return number;
}

/** اعتماد التقييم المكتبي: نتيجة غير موثقة مع مراجعة المقيّم */
export async function completeDesk(assessmentId: string, by: SessionUser, summary?: string) {
  const a = await getAssessment(assessmentId);
  const L = await levelsOf(assessmentId, 'DESK');
  const missing = FACTOR_IDS.filter(f => L[f] == null);
  if (missing.length) throw new Error(`لم تُقدّر ${missing.length} معايير بعد: ${missing.slice(0, 6).join('، ')}`);
  const r = evaluate(L, Number(a.expenses ?? 0)); const snap = snapshot(r);
  const fs = await db.select({ id: factors.id, name: factors.name }).from(factors);
  const nm = Object.fromEntries(fs.map(f => [f.id, f.name]));
  const recs = r.gateFail.map(([f, , m]) => ({ text: `استيفاء البوابة: ${nm[f]} (المستوى ${m} على الأقل)`, factors: [f], priority: 1 }))
    .concat(r.trkFail.map(([f, , m]) => ({ text: `متطلب المسار: رفع ${nm[f]} إلى المستوى ${m}`, factors: [f], priority: 2 })))
    .concat(r.gaps.slice(0, 6).map(g => ({ text: `تطوير ${nm[g.id]} (المستوى الحالي ${g.level})`, factors: [g.id], priority: 3 })));
  await db.update(assessments).set({ status: 'DESK_COMPLETED', deskResult: snap as unknown as Record<string, unknown>, deskScore: r.total, deskLevel: r.status === 'مؤهل' ? r.level : 'قيد التأهيل', deskCompletedAt: new Date(), assessorSummary: summary ?? a.assessorSummary, recommendations: a.recommendations ?? recs }).where(eq(assessments.id, assessmentId));
  const num = await issueCertificate(a, 'UNVERIFIED', snap);
  await logActivity('desk.completed', { assessmentId, userId: by.id, details: { total: r.total, level: r.level, status: r.status, certificate: num } });
  await notifyOrg(a.orgId, 'صدرت نتيجة التقييم غير الموثقة', `الدرجة ${r.total} من 100. يمكنكم الاطلاع على التفاصيل وطلب زيارة التحقق للحصول على الشهادة الموثقة.`, `/portal/assessments/${assessmentId}/result`);
  await notifyStaff('اكتمل تقييم مكتبي', `${a.number}: ${r.total} (${r.status === 'مؤهل' ? r.level : 'قيد التأهيل'})`, `/admin/assessments/${assessmentId}`);
  return r;
}

/** نسخ تقديرات المرحلة المكتبية إلى مرحلة التحقق لبدء عمل المستشار */
export async function initVerifiedReviews(assessmentId: string) {
  const existing = await db.select({ f: factorReviews.factorId }).from(factorReviews).where(and(eq(factorReviews.assessmentId, assessmentId), eq(factorReviews.phase, 'VERIFIED')));
  if (existing.length) return;
  const desk = await db.select().from(factorReviews).where(and(eq(factorReviews.assessmentId, assessmentId), eq(factorReviews.phase, 'DESK')));
  if (desk.length) await db.insert(factorReviews).values(desk.map(d => ({ assessmentId, factorId: d.factorId, phase: 'VERIFIED' as const, level: d.level, aiLevel: d.aiLevel, aiRationale: d.aiRationale, justification: d.justification, evidenceRef: d.evidenceRef, needsVerification: d.needsVerification })));
}

/** اعتماد الشهادة الموثقة بعد زيارة التحقق */
export async function completeVerification(assessmentId: string, by: SessionUser) {
  const a = await getAssessment(assessmentId);
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, assessmentId)).limit(1))[0];
  if (!v || v.status !== 'COMPLETED') throw new Error('لم تُستكمل زيارة التحقق بعد');
  const L = await levelsOf(assessmentId, 'VERIFIED');
  const r = evaluate(L, Number(a.expenses ?? 0)); const snap = snapshot(r);
  await db.update(assessments).set({ status: 'CERTIFIED', finalResult: snap as unknown as Record<string, unknown>, finalScore: r.total, finalLevel: r.status === 'مؤهل' ? r.level : 'قيد التأهيل', certifiedAt: new Date() }).where(eq(assessments.id, assessmentId));
  const num = await issueCertificate(a, 'VERIFIED', snap);
  await logActivity('certificate.verified', { assessmentId, userId: by.id, details: { total: r.total, level: r.level, certificate: num } });
  await notifyOrg(a.orgId, 'صدرت شهادة كفاءة الأثر الموثقة', `رقم الشهادة ${num} — الدرجة ${r.total}، المستوى «${r.status === 'مؤهل' ? r.level : 'قيد التأهيل'}».`, '/portal/certificates');
  return { r, num };
}

export async function notifyAssigned(assessmentId: string, title: string, body: string) {
  const a = await getAssessment(assessmentId);
  await notify([a.assessorId, a.secondAssessorId], title, body, `/assessor/assessments/${assessmentId}`);
}
export async function orgAssessments(orgId: string) {
  return db.select().from(assessments).where(eq(assessments.orgId, orgId));
}
export async function docsFor(assessmentIds: string[]) {
  if (!assessmentIds.length) return [];
  return db.select().from(documents).where(inArray(documents.assessmentId, assessmentIds));
}
