import Link from 'next/link';
import { desc, eq, like, or, and, asc, count, isNull, sql, exists, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db, assessments, organizations, users, visits } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Table, Td, Progress, LevelBadge, Empty, Badge } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { FilterBar, Select, Facets, Pager } from '@/components/admin/list-tools';
import { STATUS, TRACK_LABEL } from '@/lib/domain';
import { fmtDate } from '@/lib/format';
import { PAGE_SIZE, pageOf, likeOf, type SP } from '@/lib/list-query';
import { ASSESSMENT_STATUSES, type AssessmentStatus } from '@/db/schema';

export const metadata = { title: 'طلبات التقييم' };
const SORTS: Record<string, [string, SQL]> = {
  updated: ['آخر تحديث', desc(assessments.updatedAt)], new: ['الأحدث إنشاءً', desc(assessments.createdAt)], oldest: ['الأقدم إرسالاً', sql`${assessments.submittedAt} asc`],
  score: ['الأعلى درجة', sql`coalesce(${assessments.finalScore}, ${assessments.deskScore}) desc`], progress: ['الأعلى اكتمالاً', desc(assessments.progress)],
};
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const me = await requireStaff('assessments.view'); const sp = await searchParams;
  const q = (sp.q ?? '').trim(); const page = pageOf(sp);
  const assessor = alias(users, 'assessor'); const verifier = alias(users, 'verifier');
  const conds: SQL[] = [];
  if (sp.status && (ASSESSMENT_STATUSES as readonly string[]).includes(sp.status)) conds.push(eq(assessments.status, sp.status as AssessmentStatus));
  if (q) { const l = likeOf(q); conds.push(or(like(organizations.name, l), like(organizations.licenseNo, l), like(assessments.number, l), like(assessor.name, l), like(verifier.name, l), like(organizations.city, l))!); }
  if (sp.track && sp.track in TRACK_LABEL) conds.push(eq(assessments.track, sp.track as 'MEDIUM'));
  if (sp.year) conds.push(eq(assessments.cycleYear, Number(sp.year)));
  if (sp.assessor === 'none') conds.push(isNull(assessments.assessorId)); else if (sp.assessor === 'me') conds.push(or(eq(assessments.assessorId, me.id), eq(assessments.secondAssessorId, me.id))!); else if (sp.assessor) conds.push(or(eq(assessments.assessorId, sp.assessor), eq(assessments.secondAssessorId, sp.assessor))!);
  if (sp.verifier === 'none') conds.push(isNull(assessments.verifierId)); else if (sp.verifier) conds.push(eq(assessments.verifierId, sp.verifier));
  if (sp.manager === 'me') conds.push(eq(assessments.managerId, me.id));
  if (sp.stage === 'unassigned') conds.push(and(isNull(assessments.assessorId), eq(assessments.status, 'SUBMITTED'))!);
  if (sp.stage === 'awaiting_verifier') conds.push(and(isNull(assessments.verifierId), sql`${assessments.status} in ('DESK_COMPLETED','VERIFICATION')`, exists(db.select({ x: sql`1` }).from(visits).where(eq(visits.assessmentId, assessments.id))))!);
  if (sp.org) conds.push(eq(assessments.orgId, sp.org));
  const where = conds.length ? and(...conds) : undefined;
  const sort = SORTS[sp.sort ?? ''] ?? SORTS.updated;
  const base = db.select({ a: assessments, org: organizations.name, assessor: assessor.name, verifier: verifier.name }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId)).leftJoin(assessor, eq(assessor.id, assessments.assessorId)).leftJoin(verifier, eq(verifier.id, assessments.verifierId));
  const [rows, total, facets, team] = await Promise.all([
    base.where(where).orderBy(sort[1]).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ c: count() }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId)).leftJoin(assessor, eq(assessor.id, assessments.assessorId)).leftJoin(verifier, eq(verifier.id, assessments.verifierId)).where(where),
    db.select({ s: assessments.status, c: count() }).from(assessments).groupBy(assessments.status),
    db.select({ id: users.id, name: users.name, fv: users.isFieldVerifier }).from(users).where(and(eq(users.role, 'ASSESSOR'), eq(users.active, true))),
  ]);
  const fc = Object.fromEntries(facets.map(f => [f.s, f.c])); const all = facets.reduce((a, f) => a + f.c, 0);
  const years = [...new Set(rows.map(r => r.a.cycleYear).concat([new Date().getFullYear() - 1, new Date().getFullYear() - 2]))].sort((a, b) => b - a);
  return (
    <div>
      <PageHeader title="طلبات التقييم" subtitle="كل طلبات الجهات بمراحلها. افتح الطلب للإسناد والمتابعة." />
      <Facets base="/admin/assessments" param="status" sp={sp} items={[{ value: '', label: 'الكل', count: all }, ...(['AWAITING_PAYMENT', 'DATA_COLLECTION', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'DESK_COMPLETED', 'VERIFICATION', 'CERTIFIED', 'CANCELLED'] as AssessmentStatus[]).map(s => ({ value: s, label: STATUS[s].label, count: fc[s] ?? 0 }))]} />
      <FilterBar base="/admin/assessments" sp={sp} q={q} qPlaceholder="اسم الجهة أو الترخيص أو رقم الطلب أو اسم الخبير">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <Select name="stage" label="يحتاج إجراء" value={sp.stage} options={[['unassigned', 'بانتظار إسناد المقيّم'], ['awaiting_verifier', 'زيارة بلا خبير تحقق']]} />
        <Select name="assessor" label="المقيّم" value={sp.assessor} options={[['me', 'طلباتي'], ['none', 'غير مسند'], ...team.map(t => [t.id, t.name] as [string, string])]} />
        <Select name="verifier" label="خبير التحقق" value={sp.verifier} options={[['none', 'غير مسند'], ...team.filter(t => t.fv).map(t => [t.id, t.name] as [string, string])]} />
        <Select name="track" label="المسار" value={sp.track} options={Object.entries(TRACK_LABEL)} />
        <Select name="year" label="السنة" value={sp.year} options={years.map(y => [String(y), String(y)])} />
        <Select name="sort" label="الترتيب" value={sp.sort} options={Object.entries(SORTS).map(([k, v]) => [k, v[0]])} />
      </FilterBar>
      {rows.length ? <Table head={['الجهة', 'رقم الطلب', 'السنة', 'الحالة', 'المقيّم (غير الموثق)', 'خبير التحقق (الموثق)', 'الاكتمال', 'النتيجة', 'آخر تحديث']}>
        {rows.map(({ a, org, assessor: as, verifier: vf }) => <tr key={a.id} className="hover:bg-forest-50/40">
          <Td><Link href={`/admin/assessments/${a.id}`} className="font-semibold text-forest-800 hover:underline">{org}</Link><div className="text-xs text-muted">{a.track ? TRACK_LABEL[a.track] : ''}</div></Td>
          <Td className="ltr text-right font-mono text-xs">{a.number}</Td><Td className="num">{a.cycleYear}</Td><Td><StatusBadge status={a.status} /></Td>
          <Td>{as ?? (a.status === 'SUBMITTED' ? <Badge tone="orange">بانتظار الإسناد</Badge> : <span className="text-muted">—</span>)}</Td>
          <Td>{vf ?? <span className="text-muted">—</span>}</Td>
          <Td className="w-32"><div className="flex items-center gap-2"><Progress value={a.progress} /><span className="num text-xs">{a.progress}</span></div></Td>
          <Td>{(a.finalScore ?? a.deskScore) != null ? <span className="flex items-center gap-1.5"><b className="num">{a.finalScore ?? a.deskScore}</b><LevelBadge level={a.finalLevel ?? a.deskLevel} /></span> : '—'}</Td>
          <Td className="text-muted">{fmtDate(a.updatedAt)}</Td>
        </tr>)}
      </Table> : <Empty title="لا طلبات مطابقة" text="غيّر كلمات البحث أو الفلاتر." />}
      <Pager base="/admin/assessments" total={total[0].c} page={page} sp={sp} />
    </div>
  );
}
