import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { MapPin } from 'lucide-react';
import { db, visits, assessments, organizations } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Table, Td, Badge, Empty } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { VISIT_STATUS_LABEL } from '@/lib/domain';

export const metadata = { title: 'زيارات التحقق' };
export default async function Page() {
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const rows = await db.select({ v: visits, a: assessments, org: organizations }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(eq(visits.consultantId, u.id)).orderBy(desc(visits.scheduledAt));
  return (
    <div>
      <PageHeader title="زيارات التحقق المسندة إليّ" subtitle="تتبع العينة، والمقابلات، ومراجعة السجلات، ثم تعديل المستويات وفق ما ثبت ميدانياً." />
      {rows.length ? <Table head={['الجهة', 'الطلب', 'الموعد', 'المقر', 'الحالة', '']}>
        {rows.map(({ v, a, org }) => { const s = VISIT_STATUS_LABEL[v.status]; return <tr key={v.id}>
          <Td className="font-semibold">{org.name}<div className="text-xs font-normal text-muted">{org.city}</div></Td><Td className="ltr text-right font-mono text-xs">{a.number}</Td>
          <Td>{v.scheduledAt ? fmtDate(v.scheduledAt, true) : <span className="text-muted">لم يُحدد</span>}</Td><Td className="text-muted">{v.location ?? '—'}</Td><Td><Badge tone={s.tone} dot>{s.label}</Badge></Td>
          <Td><Link href={`/assessor/visits/${v.id}`} className="font-semibold text-forest-700 hover:underline">فتح ملف الزيارة</Link></Td>
        </tr>; })}
      </Table> : <Empty icon={<MapPin className="size-6" />} title="لا زيارات مسندة" />}
    </div>
  );
}
