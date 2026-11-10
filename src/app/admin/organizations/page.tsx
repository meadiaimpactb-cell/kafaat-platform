import Link from 'next/link';
import { and, asc, count, desc, eq, exists, inArray, isNull, like, or, sql, type SQL } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { db, organizations, assessments, organizationMembers, users } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Table, Td, Badge, Empty } from '@/components/ui';
import { FilterBar, Select, Facets, Pager } from '@/components/admin/list-tools';
import { TRACK_LABEL } from '@/lib/domain';
import { REGIONS } from '@/lib/domain';
import { VERIFICATION_LABEL } from '@/lib/org-meta';
import { PAGE_SIZE, pageOf, likeOf, type SP } from '@/lib/list-query';
import { fmtDate, fmtSAR } from '@/lib/format';

export const metadata = { title: 'الجهات' };
const SORTS: Record<string, [string, SQL]> = {
  new: ['الأحدث تسجيلاً', desc(organizations.createdAt)], name: ['الاسم', asc(organizations.name)],
  exp: ['الأعلى مصروفات', sql`${organizations.lastYearExpenses} desc`], submitted: ['الأقدم تقديماً للتوثيق', sql`${organizations.submittedForVerificationAt} asc`],
};
export default async function Page({ searchParams }: { searchParams: Promise<SP> }) {
  const u = await requireStaff(); const sp = await searchParams;
  if (!can(u, 'orgs.view') && !can(u, 'orgs.verify')) redirect('/admin?denied=1');
  const q = (sp.q ?? '').trim(); const page = pageOf(sp);
  const conds: SQL[] = [];
  if (q) {
    const l = likeOf(q);
    conds.push(or(like(organizations.name, l), like(organizations.nameEn, l), like(organizations.licenseNo, l), like(organizations.unifiedNo, l), like(organizations.city, l), like(organizations.email, l), like(organizations.phone, l), like(organizations.repName, l), like(organizations.repPhone, l), like(organizations.contactName, l),
      // الأعضاء (بريد أو اسم الحساب) ورقم الطلب
      exists(db.select({ x: sql`1` }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(and(eq(organizationMembers.orgId, organizations.id), or(like(users.email, l), like(users.name, l))))),
      exists(db.select({ x: sql`1` }).from(assessments).where(and(eq(assessments.orgId, organizations.id), like(assessments.number, l)))))!);
  }
  if (sp.verification && sp.verification in VERIFICATION_LABEL) conds.push(eq(organizations.verificationStatus, sp.verification as 'PENDING'));
  if (sp.track && sp.track in TRACK_LABEL) conds.push(eq(organizations.track, sp.track as 'MEDIUM'));
  if (sp.region) conds.push(eq(organizations.region, sp.region));
  if (sp.complete === '1') conds.push(eq(organizations.profileCompleted, true)); if (sp.complete === '0') conds.push(eq(organizations.profileCompleted, false));
  if (sp.manager === 'none') conds.push(isNull(organizations.accountManagerId)); else if (sp.manager === 'me') conds.push(eq(organizations.accountManagerId, u.id));
  if (sp.requests === '1') conds.push(exists(db.select({ x: sql`1` }).from(assessments).where(eq(assessments.orgId, organizations.id))));
  if (sp.requests === '0') conds.push(sql`not exists (select 1 from ${assessments} where ${assessments.orgId} = ${organizations.id})`);
  const where = conds.length ? and(...conds) : undefined;
  const sort = SORTS[sp.sort ?? ''] ?? SORTS.new;
  const [rows, total, facets] = await Promise.all([
    db.select().from(organizations).where(where).orderBy(sort[1]).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ c: count() }).from(organizations).where(where),
    db.select({ s: organizations.verificationStatus, c: count() }).from(organizations).groupBy(organizations.verificationStatus),
  ]);
  const ids = rows.map(r => r.id);
  const counts = ids.length ? Object.fromEntries((await db.select({ o: assessments.orgId, c: count() }).from(assessments).where(inArray(assessments.orgId, ids)).groupBy(assessments.orgId)).map(r => [r.o, r.c])) : {};
  const fc = Object.fromEntries(facets.map(f => [f.s, f.c])); const all = facets.reduce((a, f) => a + f.c, 0);
  return (
    <div>
      <PageHeader title="الجهات" subtitle={`${all} جهة مسجلة · ${fc.PENDING ?? 0} بانتظار التوثيق`} />
      <Facets base="/admin/organizations" param="verification" sp={sp} items={[{ value: '', label: 'الكل', count: all }, ...Object.entries(VERIFICATION_LABEL).map(([k, v]) => ({ value: k, label: v.label, count: fc[k] ?? 0 }))]} />
      <FilterBar base="/admin/organizations" sp={sp} q={q} qPlaceholder="الاسم أو الترخيص أو المدينة أو الممثل أو بريد الحساب أو رقم الطلب">
        {sp.verification && <input type="hidden" name="verification" value={sp.verification} />}
        <Select name="track" label="المسار" value={sp.track} options={Object.entries(TRACK_LABEL)} />
        <Select name="region" label="المنطقة" value={sp.region} options={REGIONS.map(r => [r, r])} />
        <Select name="complete" label="اكتمال الملف" value={sp.complete} options={[['1', 'مكتمل'], ['0', 'ناقص']]} />
        <Select name="requests" label="الطلبات" value={sp.requests} options={[['1', 'لديها طلبات'], ['0', 'بلا طلبات']]} />
        <Select name="manager" label="مدير الحساب" value={sp.manager} options={[['me', 'جهاتي'], ['none', 'بلا مدير']]} />
        <Select name="sort" label="الترتيب" value={sp.sort} options={Object.entries(SORTS).map(([k, v]) => [k, v[0]])} />
      </FilterBar>
      {rows.length ? <Table head={['الجهة', 'الترخيص', 'المدينة', 'المسار', 'المصروفات', 'التوثيق', 'الطلبات', 'التسجيل']}>
        {rows.map(o => { const vs = VERIFICATION_LABEL[o.verificationStatus]; return <tr key={o.id} className="hover:bg-forest-50/40">
          <Td><Link href={`/admin/organizations/${o.id}`} className="font-semibold text-forest-800 hover:underline">{o.name}</Link>{!o.profileCompleted && <Badge tone="amber" className="ms-2">ملف ناقص</Badge>}<div className="text-xs text-muted">{o.orgType ?? ''}{o.repName ? ` · ${o.repName}` : ''}</div></Td>
          <Td className="ltr text-right font-mono text-xs">{o.licenseNo ?? '—'}</Td><Td>{o.city ?? '—'}</Td><Td>{o.track ? TRACK_LABEL[o.track] : '—'}</Td><Td className="num">{fmtSAR(o.lastYearExpenses)}</Td>
          <Td><Badge tone={vs.tone} dot>{vs.label}</Badge></Td><Td className="num">{counts[o.id] ?? 0}</Td><Td className="text-muted">{fmtDate(o.createdAt)}</Td>
        </tr>; })}
      </Table> : <Empty title="لا جهات مطابقة" text="غيّر كلمات البحث أو الفلاتر." />}
      <Pager base="/admin/organizations" total={total[0].c} page={page} sp={sp} />
    </div>
  );
}
