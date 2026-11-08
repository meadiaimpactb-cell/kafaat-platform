import { notFound } from 'next/navigation';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db, factors, answers, factorReviews, documents, documentRequirements, infoRequests, organizations, visits, users } from '@/db';
import { requireUser, can } from '@/lib/auth';
import { getAssessment, canAccess, initVerifiedReviews } from '@/lib/workflow';
import { SECTIONS } from '@/lib/domain';
import { Workspace, type WFactor, type WReview } from '@/components/assessor/workspace';
import type { DocAnalysis } from '@/lib/ai';

export const metadata = { title: 'مساحة التقييم' };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const a = await getAssessment(id);
  if (!a) notFound();
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, id)).limit(1))[0];
  const isConsultant = v?.consultantId === u.id;
  if (!canAccess(u, a) && !isConsultant) notFound();
  const staff = u.role === 'SUPER_ADMIN' || (u.role === 'ACCOUNT_MANAGER' && can(u, 'assessments.manage'));
  const phase = a.status === 'VERIFICATION' || a.status === 'CERTIFIED' ? 'VERIFIED' as const : 'DESK' as const;
  if (phase === 'VERIFIED') await initVerifiedReviews(id);
  const editable = phase === 'DESK'
    ? ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(a.status) && (staff || a.assessorId === u.id || a.secondAssessorId === u.id)
    : a.status === 'VERIFICATION' && (staff || isConsultant);
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const fs = await db.select().from(factors).where(eq(factors.active, true)).orderBy(asc(factors.sortOrder));
  const ans = await db.select().from(answers).where(eq(answers.assessmentId, id));
  const rv = await db.select().from(factorReviews).where(eq(factorReviews.assessmentId, id));
  const reqs = await db.select().from(documentRequirements);
  const docs = await db.select().from(documents).where(eq(documents.assessmentId, id)).orderBy(desc(documents.createdAt));
  const irs = await db.select().from(infoRequests).where(eq(infoRequests.assessmentId, id)).orderBy(desc(infoRequests.createdAt));
  const assessor = a.assessorId ? (await db.select({ n: users.name }).from(users).where(eq(users.id, a.assessorId)))[0]?.n : null;
  const order = SECTIONS.map(s => s.key);
  const list: WFactor[] = fs.sort((x, y) => order.indexOf(x.section) - order.indexOf(y.section) || x.sortOrder - y.sortOrder).map(f => ({
    id: f.id, name: f.name, section: f.section, group: f.group, axis: f.axis, weight: f.weight, question: f.question, definition: f.definition ?? '', levels: f.levels as string[], rule: f.rule ?? '', flags: (f.flags as string[]) ?? [], calc: f.calc ?? '', evidence: f.evidence as string[], asks: f.asks as string[], example: f.example ?? '',
  }));
  const toRv = (p: 'DESK' | 'VERIFIED') => Object.fromEntries(rv.filter(r => r.phase === p).map(r => [r.factorId, { level: r.level, aiLevel: r.aiLevel, aiConfidence: r.aiConfidence, aiRationale: r.aiRationale, justification: r.justification ?? '', evidenceRef: r.evidenceRef ?? '', needsVerification: r.needsVerification } satisfies WReview]));
  const reqMap = Object.fromEntries(reqs.map(r => [r.id, r]));
  return (
    <Workspace
      assessment={{ id: a.id, number: a.number, status: a.status, track: a.track ?? 'EMERGING', expenses: Number(a.expenses ?? 0), cycleYear: a.cycleYear, progress: a.progress, assessor, summary: a.assessorSummary ?? '' }}
      org={{ name: org.name, city: org.city ?? '', field: org.field ?? '', beneficiaries: org.beneficiariesCount, programs: org.programsCount, employees: org.employeesCount, revenue: org.lastYearRevenue, programExpenses: org.programExpenses, description: org.description ?? '' }}
      phase={phase} editable={editable} factors={list} sections={SECTIONS} focus={sp.f}
      answers={Object.fromEntries(ans.map(x => [x.factorId, { status: x.status, selfLevel: x.selfLevel, answer: x.answer ?? '' }]))}
      reviews={toRv(phase)} deskReviews={phase === 'VERIFIED' ? toRv('DESK') : undefined}
      docs={docs.map(d => ({ id: d.id, fileName: d.fileName, mimeType: d.mimeType, size: d.size, requirement: d.requirementId ? reqMap[d.requirementId]?.title ?? null : null, reqFactors: d.requirementId ? (reqMap[d.requirementId]?.factorIds as string[]) ?? [] : (d.factorIds as string[]) ?? [], aiStatus: d.aiStatus, ai: (d.aiResult as unknown as DocAnalysis) ?? null }))}
      requests={irs.map(r => ({ id: r.id, factorId: r.factorId, message: r.message, response: r.response, status: r.status, createdAt: r.createdAt.toISOString() }))}
      visitId={v?.id ?? null}
    />
  );
}
