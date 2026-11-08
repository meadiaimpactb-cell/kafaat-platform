import Link from 'next/link';
import { desc, eq, like, or, and, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { Search } from 'lucide-react';
import { db, assessments, organizations, users } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Table, Td, Progress, LevelBadge, Empty } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { STATUS, TRACK_LABEL } from '@/lib/domain';
import { fmtDate } from '@/lib/format';
import { ASSESSMENT_STATUSES, type AssessmentStatus } from '@/db/schema';
import { cn } from '@/lib/cn';

export const metadata = { title: 'طلبات التقييم' };
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff('assessments.view');
  const sp = await searchParams;
  const assessor = alias(users, 'assessor');
  const conds: SQL[] = [];
  if (sp.status && (ASSESSMENT_STATUSES as readonly string[]).includes(sp.status)) conds.push(eq(assessments.status, sp.status as AssessmentStatus));
  if (sp.q) conds.push(or(like(organizations.name, `%${sp.q}%`), like(assessments.number, `%${sp.q}%`))!);
  const rows = await db.select({ a: assessments, org: organizations.name, assessor: assessor.name }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId)).leftJoin(assessor, eq(assessor.id, assessments.assessorId)).where(conds.length ? and(...conds) : undefined).orderBy(desc(assessments.updatedAt)).limit(300);
  const tabs: (AssessmentStatus | '')[] = ['', 'AWAITING_PAYMENT', 'DATA_COLLECTION', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'DESK_COMPLETED', 'VERIFICATION', 'CERTIFIED', 'CANCELLED'];
  return (
    <div>
      <PageHeader title="طلبات التقييم" subtitle="كل طلبات الجهات بمراحلها. افتح الطلب للإسناد والمتابعة." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-line">{tabs.map(t => <Link key={t} href={t ? `?status=${t}` : '?'} className={cn('rounded-xl px-3 py-1.5 text-sm font-semibold', (sp.status ?? '') === t ? 'bg-forest-800 text-white' : 'text-ink-2 hover:bg-forest-50')}>{t ? STATUS[t].label : 'الكل'}</Link>)}</div>
        <form className="relative ms-auto"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" />{sp.status && <input type="hidden" name="status" value={sp.status} />}<input name="q" defaultValue={sp.q} placeholder="اسم الجهة أو رقم الطلب" className="input h-10 w-64 pr-9" /></form>
      </div>
      {rows.length ? <Table head={['الجهة', 'رقم الطلب', 'السنة', 'المسار', 'الحالة', 'المقيّم', 'الاكتمال', 'النتيجة', 'آخر تحديث']}>
        {rows.map(({ a, org, assessor: as }) => <tr key={a.id} className="hover:bg-forest-50/40">
          <Td><Link href={`/admin/assessments/${a.id}`} className="font-semibold text-forest-800 hover:underline">{org}</Link></Td>
          <Td className="ltr text-right font-mono text-xs">{a.number}</Td><Td className="num">{a.cycleYear}</Td><Td>{a.track ? TRACK_LABEL[a.track] : '—'}</Td><Td><StatusBadge status={a.status} /></Td>
          <Td>{as ?? (a.status === 'SUBMITTED' ? <span className="font-semibold text-orange-brand">بانتظار الإسناد</span> : <span className="text-muted">—</span>)}</Td>
          <Td className="w-32"><div className="flex items-center gap-2"><Progress value={a.progress} /><span className="num text-xs">{a.progress}</span></div></Td>
          <Td>{(a.finalScore ?? a.deskScore) != null ? <span className="flex items-center gap-1.5"><b className="num">{a.finalScore ?? a.deskScore}</b><LevelBadge level={a.finalLevel ?? a.deskLevel} /></span> : '—'}</Td>
          <Td className="text-muted">{fmtDate(a.updatedAt)}</Td>
        </tr>)}
      </Table> : <Empty title="لا طلبات مطابقة" />}
    </div>
  );
}
