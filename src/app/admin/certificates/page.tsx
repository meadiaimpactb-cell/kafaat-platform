import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db, certificates, organizations } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Table, Td, Badge, LevelBadge, Empty } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { revokeCertificate } from '@/app/actions/admin';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'الشهادات' };
export default async function Page() {
  const u = await requireStaff('certificates.issue');
  const rows = await db.select({ c: certificates, org: organizations.name }).from(certificates).innerJoin(organizations, eq(organizations.id, certificates.orgId)).orderBy(desc(certificates.issuedAt));
  return (
    <div>
      <PageHeader title="الشهادات والإفادات" subtitle="كل الإصدارات مع حالتها. صفحة التحقق العامة تعرض الحالة لحظياً لأي جهة تتحقق من الشهادة." />
      {rows.length ? <Table head={['الرقم', 'الجهة', 'النوع', 'الدرجة', 'الفترة', 'سارية حتى', 'الحالة', '']}>
        {rows.map(({ c, org }) => <tr key={c.id}>
          <Td><Link href={`/print/certificate/${c.id}`} target="_blank" className="ltr font-mono text-xs text-forest-700 hover:underline">{c.number}</Link></Td><Td className="font-semibold">{org}</Td>
          <Td><Badge tone={c.type === 'VERIFIED' ? 'green' : 'amber'}>{c.type === 'VERIFIED' ? 'موثقة' : 'غير موثقة'}</Badge></Td>
          <Td><span className="flex items-center gap-2"><b className="num">{c.score}</b><LevelBadge level={c.level} /></span></Td><Td className="num">{c.periodYear}</Td><Td>{fmtDate(c.validUntil)}</Td>
          <Td>{c.status === 'ACTIVE' ? <Badge tone="green" dot>سارية</Badge> : <span title={c.revokedReason ?? ''}><Badge tone="rose">ملغاة</Badge></span>}</Td>
          <Td>{c.status === 'ACTIVE' && can(u, 'certificates.revoke') && <details className="relative"><summary className="cursor-pointer list-none text-sm font-semibold text-rose-600">إلغاء</summary><ActionForm action={revokeCertificate} className="absolute left-0 z-10 mt-2 w-72 space-y-2 rounded-2xl bg-white p-4 shadow-xl ring-1 ring-line"><input type="hidden" name="id" value={c.id} /><input name="reason" className="input" placeholder="سبب الإلغاء" /><Submit variant="danger" size="sm">تأكيد الإلغاء</Submit></ActionForm></details>}</Td>
        </tr>)}
      </Table> : <Empty title="لا شهادات" />}
    </div>
  );
}
