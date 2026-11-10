import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Receipt, Wallet } from 'lucide-react';
import { db, payments, invoices, assessments } from '@/db';
import { requireOrgUser } from '@/lib/auth';
import { PageHeader, Table, Td, Badge, Empty, ButtonLink } from '@/components/ui';
import { fmtDate, fmtSAR } from '@/lib/format';
import { PAYMENT_STATUS_LABEL, PRODUCT_LABEL } from '@/lib/domain';

export const metadata = { title: 'المدفوعات والفواتير' };
export default async function Page({ searchParams }: { searchParams: Promise<{ receipt?: string }> }) {
  const u = await requireOrgUser(); const sp = await searchParams;
  const rows = await db.select({ p: payments, inv: invoices, num: assessments.number }).from(payments).leftJoin(invoices, eq(invoices.paymentId, payments.id)).leftJoin(assessments, eq(assessments.id, payments.assessmentId)).where(eq(payments.orgId, u.orgId!)).orderBy(desc(payments.createdAt));
  return (
    <div>
      <PageHeader title="المدفوعات والفواتير" subtitle="تصدر فاتورة ضريبية تلقائياً لكل دفعة مكتملة." />
      {sp.receipt && <div className="mb-5 rounded-2xl bg-violet-50 p-4 text-violet-900 ring-1 ring-violet-200">استلمنا إيصال التحويل، وسيُعتمد خلال يوم عمل، وتصلك رسالة عند الاعتماد.</div>}
      {rows.length ? (
        <Table head={['رقم الدفعة', 'الخدمة', 'الطلب', 'المبلغ', 'الحالة', 'التاريخ', '']}>
          {rows.map(({ p, inv, num }) => { const s = PAYMENT_STATUS_LABEL[p.status]; return (
            <tr key={p.id} className="hover:bg-forest-50/40">
              <Td className="ltr text-right font-mono text-xs">{p.number}</Td>
              <Td className="font-semibold">{PRODUCT_LABEL[p.product]}</Td>
              <Td>{p.assessmentId ? <Link href={`/portal/assessments/${p.assessmentId}`} className="ltr font-mono text-xs text-forest-700 hover:underline">{num}</Link> : '—'}</Td>
              <Td className="num font-semibold">{fmtSAR(p.total)}{Number(p.discount) > 0 && <div className="text-xs font-normal text-forest-700">خصم {fmtSAR(p.discount)}</div>}</Td>
              <Td><Badge tone={s.tone} dot>{s.label}</Badge></Td>
              <Td className="text-muted">{fmtDate(p.paidAt ?? p.createdAt)}</Td>
              <Td>{inv ? <ButtonLink href={`/print/invoice/${inv.id}`} target="_blank" variant="outline" size="sm"><Receipt className="size-4" /> الفاتورة</ButtonLink> : ['PENDING', 'FAILED'].includes(p.status) ? <ButtonLink href={`/portal/checkout/${p.id}`} size="sm">ادفع</ButtonLink> : null}</Td>
            </tr>
          ); })}
        </Table>
      ) : <Empty icon={<Wallet className="size-6" />} title="لا مدفوعات بعد" />}
    </div>
  );
}
