import { and, count, desc, eq, inArray, isNull, like, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { MapPin } from 'lucide-react';
import { db, visits, assessments, organizations, users } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Card, Empty } from '@/components/ui';
import { FilterBar, Select, Facets, Pager } from '@/components/admin/list-tools';
import { VisitPanel } from '@/components/admin/visit-panel';
import { VISIT_STATUS_LABEL } from '@/lib/domain';
import { PAGE_SIZE, pageOf, likeOf, type SP } from '@/lib/list-query';

export const metadata = { title: 'زيارات التحقق' };
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await requireStaff('visits.manage'); const sp = await searchParams;
  const q = (sp.q ?? '').trim(); const page = pageOf(sp);
  const consultantA = alias(users, 'consultant');
  const conds: SQL[] = [];
  if (sp.status && sp.status in VISIT_STATUS_LABEL) conds.push(eq(visits.status, sp.status as 'PAID'));
  if (sp.consultant === 'none') conds.push(isNull(visits.consultantId)); else if (sp.consultant) conds.push(eq(visits.consultantId, sp.consultant));
  if (sp.followup && ['NONE', 'DRAFT', 'PUBLISHED'].includes(sp.followup)) conds.push(eq(visits.followupStatus, sp.followup as 'NONE'));
  if (sp.confirm === '0') conds.push(and(eq(visits.status, 'SCHEDULED'), isNull(visits.orgConfirmedAt))!);
  if (sp.focus) conds.push(eq(visits.id, sp.focus));
  if (q) { const l = likeOf(q); conds.push(or(like(organizations.name, l), like(assessments.number, l), like(consultantA.name, l), like(organizations.city, l))!); }
  const where = conds.length ? and(...conds) : undefined;
  const base = db.select({ v: visits, a: assessments, org: organizations, cons: consultantA.name }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).leftJoin(consultantA, eq(consultantA.id, visits.consultantId));
  const [rows, total, facets, cons] = await Promise.all([
    base.where(where).orderBy(sql`${visits.scheduledAt} is null`, sql`${visits.scheduledAt} asc`, desc(visits.updatedAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ c: count() }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).leftJoin(consultantA, eq(consultantA.id, visits.consultantId)).where(where),
    db.select({ s: visits.status, c: count() }).from(visits).groupBy(visits.status),
    db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.role, 'ASSESSOR'), eq(users.isFieldVerifier, true), eq(users.active, true))),
  ]);
  const load = Object.fromEntries((await db.select({ id: visits.consultantId, c: count() }).from(visits).where(inArray(visits.status, ['SCHEDULED', 'IN_PROGRESS'])).groupBy(visits.consultantId)).map(r => [r.id ?? '', r.c]));
  const consultants = cons.map(c => ({ ...c, load: load[c.id] ?? 0 }));
  const fc = Object.fromEntries(facets.map(f => [f.s, f.c])); const all = facets.reduce((a, f) => a + f.c, 0);
  return (
    <div>
      <PageHeader title="زيارات التحقق" subtitle="جدولة الزيارات المدفوعة وإسناد خبراء التحقق ومتابعة التأكيد والتقرير التعقيبي. تُشعر الجهة والخبير تلقائياً." />
      <Facets base="/admin/visits" param="status" sp={sp} items={[{ value: '', label: 'الكل', count: all }, ...(['PAID', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'AWAITING_PAYMENT', 'CANCELLED'] as const).map(s => ({ value: s, label: VISIT_STATUS_LABEL[s].label, count: fc[s] ?? 0 }))]} />
      <FilterBar base="/admin/visits" sp={sp} q={q} qPlaceholder="اسم الجهة أو رقم الطلب أو اسم الخبير">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <Select name="consultant" label="خبير التحقق" value={sp.consultant} options={[['none', 'غير مسند'], ...consultants.map(c => [c.id, c.name] as [string, string])]} />
        <Select name="confirm" label="التأكيد" value={sp.confirm} options={[['0', 'مجدولة ولم تؤكد الجهة']]} />
        <Select name="followup" label="التقرير التعقيبي" value={sp.followup} options={[['NONE', 'لم يبدأ'], ['DRAFT', 'مسودة'], ['PUBLISHED', 'منشور']]} />
      </FilterBar>
      {rows.length ? <div className="space-y-3">{rows.map(({ v, a, org }) => (
        <Card key={v.id} className="p-5"><VisitPanel v={v} number={a.number} org={{ id: org.id, name: org.name, city: org.city, assessmentId: a.id }} consultants={consultants} canManage={can(u, 'visits.manage')} compact /></Card>
      ))}</div> : <Empty icon={<MapPin className="size-6" />} title="لا زيارات مطابقة" />}
      <Pager base="/admin/visits" total={total[0].c} page={page} sp={sp} />
    </div>
  );
}
