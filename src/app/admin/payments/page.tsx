import Link from 'next/link';
import { and, desc, eq, type SQL } from 'drizzle-orm';
import { Check, FileImage, Receipt } from 'lucide-react';
import { db, payments, organizations, invoices, coupons } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Table, Td, Badge, Empty, Stat } from '@/components/ui';
import { ActionForm, ActionButton } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { approvePayment, rejectPayment, refundPayment } from '@/app/actions/admin';
import { PAYMENT_STATUS_LABEL, PRODUCT_LABEL } from '@/lib/domain';
import { GATEWAY_INFO } from '@/lib/payments';
import { fmtDate, fmtSAR } from '@/lib/format';
import { PAYMENT_STATUSES } from '@/db/schema';
import { cn } from '@/lib/cn';

export const metadata = { title: 'المدفوعات' };
export default async function Page({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const u = await requireStaff('payments.view'); const sp = await searchParams;
  const conds: SQL[] = []; if (sp.status && (PAYMENT_STATUSES as readonly string[]).includes(sp.status)) conds.push(eq(payments.status, sp.status as (typeof PAYMENT_STATUSES)[number]));
  const rows = await db.select({ p: payments, org: organizations.name, inv: invoices.id, coupon: coupons.code }).from(payments).innerJoin(organizations, eq(organizations.id, payments.orgId)).leftJoin(invoices, eq(invoices.paymentId, payments.id)).leftJoin(coupons, eq(coupons.id, payments.couponId)).where(conds.length ? and(...conds) : undefined).orderBy(desc(payments.createdAt)).limit(500);
  const all = await db.select({ s: payments.status, t: payments.total, v: payments.vat }).from(payments);
  const paid = all.filter(x => x.s === 'PAID');
  return (
    <div className="space-y-6">
      <PageHeader title="المدفوعات والفواتير" subtitle="كل الدفعات تنعكس آلياً على مسار الطلب: الدفع يفتح التعبئة، ودفع الزيارة يفتح مرحلة التحقق." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="إجمالي المحصّل" value={fmtSAR(paid.reduce((s, x) => s + Number(x.t), 0))} hint={`${paid.length} دفعة`} />
        <Stat label="ضريبة القيمة المضافة المحصلة" value={fmtSAR(paid.reduce((s, x) => s + Number(x.v), 0))} tone="lime" />
        <Stat label="بانتظار الاعتماد" value={all.filter(x => x.s === 'AWAITING_APPROVAL').length} tone="orange" />
      </div>
      <div className="flex flex-wrap gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-line">{['', ...PAYMENT_STATUSES].map(t => <Link key={t} href={t ? `?status=${t}` : '?'} className={cn('rounded-xl px-3 py-1.5 text-sm font-semibold', (sp.status ?? '') === t ? 'bg-forest-800 text-white' : 'text-ink-2 hover:bg-forest-50')}>{t ? PAYMENT_STATUS_LABEL[t].label : 'الكل'}</Link>)}</div>
      {rows.length ? <Table head={['الدفعة', 'الجهة', 'الخدمة', 'المبلغ', 'الوسيلة', 'الحالة', 'التاريخ', 'إجراءات']}>
        {rows.map(({ p, org, inv, coupon }) => { const s = PAYMENT_STATUS_LABEL[p.status]; return <tr key={p.id} className={p.status === 'AWAITING_APPROVAL' ? 'bg-violet-50/40' : ''}>
          <Td className="ltr text-right font-mono text-xs">{p.number}</Td><Td className="font-semibold">{org}</Td><Td className="text-sm">{PRODUCT_LABEL[p.product]}</Td>
          <Td className="num"><b>{fmtSAR(p.total)}</b>{Number(p.discount) > 0 && <div className="text-xs text-forest-700">خصم {fmtSAR(p.discount)}{coupon ? ` (${coupon})` : ''}</div>}</Td>
          <Td className="text-sm">{p.gateway ? GATEWAY_INFO[p.gateway]?.title ?? (p.gateway === 'coupon' ? 'خصم كامل' : p.gateway) : '—'}</Td>
          <Td><Badge tone={s.tone} dot>{s.label}</Badge></Td><Td className="text-muted">{fmtDate(p.paidAt ?? p.createdAt, true)}</Td>
          <Td><div className="flex flex-wrap items-center gap-2">
            {p.receiptPath && <a href={`/api/receipts/${p.id}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline"><FileImage className="size-4" /> الإيصال</a>}
            {inv && <Link href={`/print/invoice/${inv}`} target="_blank" className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 hover:underline"><Receipt className="size-4" /> الفاتورة</Link>}
            {can(u, 'payments.approve') && ['AWAITING_APPROVAL', 'PENDING'].includes(p.status) && <ActionButton action={approvePayment.bind(null, p.id)} size="sm" variant={p.status === 'AWAITING_APPROVAL' ? 'lime' : 'outline'} confirm={`اعتماد الدفعة ${p.number} كمدفوعة؟ ستنعكس على الطلب فوراً.`}><Check className="size-4" /> {p.status === 'AWAITING_APPROVAL' ? 'اعتماد' : 'تسجيل كمدفوعة'}</ActionButton>}
            {can(u, 'payments.approve') && p.status === 'AWAITING_APPROVAL' && <details className="relative"><summary className="cursor-pointer list-none text-xs font-semibold text-rose-600">رفض</summary><ActionForm action={rejectPayment} className="absolute left-0 z-10 mt-2 w-64 space-y-2 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-line"><input type="hidden" name="paymentId" value={p.id} /><input name="reason" className="input" placeholder="السبب" /><Submit size="sm" variant="danger">رفض الإيصال</Submit></ActionForm></details>}
            {can(u, 'payments.refund') && p.status === 'PAID' && <details className="relative"><summary className="cursor-pointer list-none text-xs text-muted hover:text-rose-600">استرداد</summary><ActionForm action={refundPayment} className="absolute left-0 z-10 mt-2 w-64 space-y-2 rounded-2xl bg-white p-3 shadow-xl ring-1 ring-line"><input type="hidden" name="paymentId" value={p.id} /><input name="note" className="input" placeholder="ملاحظة" /><Submit size="sm" variant="danger">تسجيل الاسترداد</Submit></ActionForm></details>}
          </div></Td>
        </tr>; })}
      </Table> : <Empty title="لا دفعات" />}
    </div>
  );
}
