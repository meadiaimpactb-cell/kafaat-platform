import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, activityLogs, users, assessments } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Table, Td } from '@/components/ui';
import { ACTION_LABEL } from '@/lib/domain';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'سجل النشاط' };
export default async function Page() {
  await requireStaff('audit.view');
  const rows = await db.select({ l: activityLogs, who: users.name, role: users.role, num: assessments.number }).from(activityLogs).leftJoin(users, eq(users.id, activityLogs.userId)).leftJoin(assessments, eq(assessments.id, activityLogs.assessmentId)).orderBy(desc(activityLogs.createdAt)).limit(400);
  return (
    <div>
      <PageHeader title="سجل النشاط" subtitle="أثر تدقيقي لكل إجراء على المنصة: من فعل ماذا ومتى." />
      <Table head={['الوقت', 'الإجراء', 'المستخدم', 'الطلب', 'التفاصيل']}>
        {rows.map(({ l, who, num }) => <tr key={l.id}>
          <Td className="whitespace-nowrap text-xs text-muted">{fmtDate(l.createdAt, true)}</Td><Td className="font-semibold">{ACTION_LABEL[l.action] ?? l.action}</Td><Td>{who ?? 'النظام'}</Td>
          <Td>{l.assessmentId ? <Link href={`/admin/assessments/${l.assessmentId}`} className="ltr font-mono text-xs text-forest-700 hover:underline">{num}</Link> : '—'}</Td>
          <Td className="ltr max-w-md truncate text-left font-mono text-[11px] text-muted">{l.details ? JSON.stringify(l.details) : ''}</Td>
        </tr>)}
      </Table>
    </div>
  );
}
