import Link from 'next/link';
import { desc, eq, like, or, count } from 'drizzle-orm';
import { Search } from 'lucide-react';
import { db, organizations, assessments } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Table, Td, Badge, Empty } from '@/components/ui';
import { TRACK_LABEL } from '@/lib/domain';
import { fmtDate, fmtSAR } from '@/lib/format';

export const metadata = { title: 'الجهات' };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff('orgs.view'); const sp = await searchParams;
  const rows = await db.select().from(organizations).where(sp.q ? or(like(organizations.name, `%${sp.q}%`), like(organizations.licenseNo, `%${sp.q}%`), like(organizations.city, `%${sp.q}%`)) : undefined).orderBy(desc(organizations.createdAt));
  const counts = Object.fromEntries((await db.select({ o: assessments.orgId, c: count() }).from(assessments).groupBy(assessments.orgId)).map(r => [r.o, r.c]));
  return (
    <div>
      <PageHeader title="الجهات" subtitle={`${rows.length} جهة مسجلة`} actions={<form className="relative"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input name="q" defaultValue={sp.q} placeholder="الاسم أو الترخيص أو المدينة" className="input h-10 w-64 pr-9" /></form>} />
      {rows.length ? <Table head={['الجهة', 'رقم الترخيص', 'المدينة', 'المجال', 'المسار', 'المصروفات', 'الطلبات', 'التسجيل']}>
        {rows.map(o => <tr key={o.id} className="hover:bg-forest-50/40">
          <Td><Link href={`/admin/organizations/${o.id}`} className="font-semibold text-forest-800 hover:underline">{o.name}</Link>{!o.profileCompleted && <Badge tone="amber" className="ms-2">بيانات ناقصة</Badge>}</Td>
          <Td className="ltr text-right font-mono text-xs">{o.licenseNo ?? '—'}</Td><Td>{o.city ?? '—'}</Td><Td className="text-muted">{o.field ?? '—'}</Td><Td>{o.track ? TRACK_LABEL[o.track] : '—'}</Td><Td className="num">{fmtSAR(o.lastYearExpenses)}</Td><Td className="num">{counts[o.id] ?? 0}</Td><Td className="text-muted">{fmtDate(o.createdAt)}</Td>
        </tr>)}
      </Table> : <Empty title="لا جهات" />}
    </div>
  );
}
