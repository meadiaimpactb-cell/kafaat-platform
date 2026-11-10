import Link from 'next/link';
import { desc, eq, or } from 'drizzle-orm';
import { db, assessments, organizations } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Table, Td, Progress, LevelBadge, Empty } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { fmtDate } from '@/lib/format';
import { TRACK_LABEL } from '@/lib/domain';

export const metadata = { title: 'طلبات التقييم' };
export default async function Page() {
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const rows = await db.select({ a: assessments, org: organizations.name }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(or(eq(assessments.assessorId, u.id), eq(assessments.secondAssessorId, u.id), eq(assessments.verifierId, u.id))).orderBy(desc(assessments.updatedAt));
  return (
    <div>
      <PageHeader title="طلبات التقييم المسندة إليّ" />
      {rows.length ? <Table head={['الجهة', 'رقم الطلب', 'المسار', 'الحالة', 'اكتمال الملف', 'أُرسل', 'النتيجة']}>
        {rows.map(({ a, org }) => <tr key={a.id} className="hover:bg-forest-50/40">
          <Td><Link href={`/assessor/assessments/${a.id}`} className="font-semibold text-forest-800 hover:underline">{org}</Link></Td>
          <Td className="ltr text-right font-mono text-xs">{a.number}</Td><Td>{a.track ? TRACK_LABEL[a.track] : '—'}</Td><Td><StatusBadge status={a.status} /></Td>
          <Td className="w-40"><div className="flex items-center gap-2"><Progress value={a.progress} /><span className="num text-xs">{a.progress}٪</span></div></Td>
          <Td className="text-muted">{fmtDate(a.submittedAt)}</Td><Td>{a.deskScore != null ? <span className="flex items-center gap-2"><b className="num">{a.deskScore}</b><LevelBadge level={a.deskLevel} /></span> : '—'}</Td>
        </tr>)}
      </Table> : <Empty title="لا طلبات مسندة" />}
    </div>
  );
}
