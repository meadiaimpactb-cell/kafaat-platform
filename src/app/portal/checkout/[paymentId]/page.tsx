import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { AlertTriangle, Clock, Landmark, Lock, ShieldCheck } from 'lucide-react';
import { db, payments, assessments, coupons } from '@/db';
import { requireOrgUser, ownsOrg } from '@/lib/auth';
import { getGateways, GATEWAY_INFO } from '@/lib/payments';
import { getSetting } from '@/lib/settings';
import { PageHeader, Card, Button, ButtonLink } from '@/components/ui';
import { fmtSAR } from '@/lib/format';
import { PRODUCT_LABEL } from '@/lib/domain';
import { cancelPendingPayment } from '@/app/actions/org';
import { CouponForm, CheckoutForm, ReceiptForm } from '@/components/portal/checkout-forms';

export const metadata = { title: 'الدفع' };
export default async function Page({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<{ bank?: string; failed?: string; error?: string }> }) {
  const { paymentId } = await params; const sp = await searchParams;
  const u = await requireOrgUser();
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!pay || !ownsOrg(u, pay.orgId)) notFound();
  const a = pay.assessmentId ? (await db.select().from(assessments).where(eq(assessments.id, pay.assessmentId)).limit(1))[0] : null;
  if (pay.status === 'PAID') redirect(pay.product === 'CERTIFICATE' ? `/portal/assessments/${pay.assessmentId}` : `/portal/assessments/${pay.assessmentId}/verification`);
  const coupon = pay.couponId ? (await db.select().from(coupons).where(eq(coupons.id, pay.couponId)).limit(1))[0] : null;
  const gws = await getGateways(true);
  const [pricing, bank] = await Promise.all([getSetting('pricing'), getSetting('bank')]);
  const isVisit = pay.product === 'VERIFICATION_VISIT';
  const bankMode = sp.bank === '1' && gws.some(g => g.id === 'bank_transfer');

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow={isVisit ? 'زيارة التحقق' : 'الخطوة 2 من 7'} title="إتمام الدفع" subtitle={isVisit ? 'بعد الدفع تُجدول زيارة الخبير الميدانية لتوثيق النتيجة.' : 'بعد الدفع مباشرة تُفتح لك الأسئلة ورفع الملفات.'} />
      {sp.failed && pay.status === 'FAILED' && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">
          <div className="flex items-center gap-2"><AlertTriangle className="size-5" /> لم تكتمل عملية الدفع. لم يُخصم أي مبلغ.</div>
          <form action={cancelPendingPayment.bind(null, pay.id)}><Button size="sm" variant="danger">إعادة المحاولة</Button></form>
        </div>
      )}
      {pay.status === 'FAILED' && !sp.failed && (
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200"><span>المحاولة السابقة لم تنجح.</span><form action={cancelPendingPayment.bind(null, pay.id)}><Button size="sm" variant="danger">إعادة المحاولة</Button></form></div>
      )}
      {pay.status === 'AWAITING_APPROVAL' && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-violet-50 p-4 text-violet-900 ring-1 ring-violet-200"><Clock className="size-5" /> استلمنا إيصال التحويل، وسيُعتمد خلال يوم عمل، وستصلك رسالة عند الاعتماد.</div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          {bankMode ? (
            <Card className="p-7">
              <div className="mb-5 flex items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-forest-100 text-forest-800"><Landmark /></div><div><div className="font-display text-lg font-semibold">التحويل البنكي</div><div className="text-sm text-muted">حوّل المبلغ ثم ارفع الإيصال</div></div></div>
              <dl className="grid gap-3 rounded-2xl bg-forest-50 p-5 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">البنك</dt><dd className="font-semibold">{bank.bankName}</dd></div>
                <div><dt className="text-muted">اسم المستفيد</dt><dd className="font-semibold">{bank.accountName}</dd></div>
                <div className="sm:col-span-2"><dt className="text-muted">رقم الآيبان</dt><dd className="ltr text-right font-mono text-base font-bold tracking-wider">{bank.iban}</dd></div>
                <div><dt className="text-muted">المبلغ</dt><dd className="font-bold num">{fmtSAR(pay.total)}</dd></div>
                <div><dt className="text-muted">مرجع التحويل</dt><dd className="ltr text-right font-mono font-bold">{pay.number}</dd></div>
              </dl>
              {bank.note && <p className="mt-3 text-sm text-muted">{bank.note}</p>}
              {pay.status === 'PENDING' || pay.status === 'FAILED' ? <div className="mt-6"><ReceiptForm paymentId={pay.id} /></div> : null}
              <div className="mt-4"><ButtonLink href={`/portal/checkout/${pay.id}`} variant="ghost" size="sm">← اختيار وسيلة دفع أخرى</ButtonLink></div>
            </Card>
          ) : (
            <Card className="p-7">
              <div className="mb-1 font-display text-lg font-semibold">اختر وسيلة الدفع</div>
              <p className="mb-5 text-sm text-muted">الوسائل المعروضة هي المفعّلة من لوحة التحكم، وتنعكس أي إضافة جديدة هنا مباشرة.</p>
              {pay.status === 'PENDING' ? (
                <CheckoutForm paymentId={pay.id} free={Number(pay.total) === 0} error={sp.error} gateways={gws.map(g => ({ id: g.id, title: GATEWAY_INFO[g.id]?.title ?? g.name, desc: GATEWAY_INFO[g.id]?.desc ?? '', methods: GATEWAY_INFO[g.id]?.methods ?? '', test: g.mode !== 'LIVE' }))} />
              ) : pay.status === 'AWAITING_APPROVAL' ? <p className="text-sm text-muted">الدفعة بانتظار اعتماد الإدارة.</p> : <p className="text-sm text-muted">اضغط «إعادة المحاولة» أعلاه.</p>}
            </Card>
          )}
          <div className="flex flex-wrap items-center gap-5 px-2 text-xs text-muted">
            <span className="flex items-center gap-1.5"><Lock className="size-3.5" /> اتصال مشفّر</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> لا نخزّن بيانات البطاقة</span>
            <span>تصدر فاتورة ضريبية تلقائياً بعد الدفع</span>
          </div>
        </div>
        <Card className="h-fit overflow-hidden">
          <div className="bg-forest-950 p-6 text-white">
            <div className="text-xs text-white/55 ltr text-right">{pay.number}</div>
            <div className="mt-1 font-display text-lg font-semibold">{PRODUCT_LABEL[pay.product]}</div>
            {a && <div className="text-sm text-white/65">{a.number} · السنة المالية {a.cycleYear}</div>}
          </div>
          <div className="space-y-3 p-6 text-sm">
            <Row k="السعر" v={fmtSAR(pay.listPrice)} />
            {Number(pay.discount) > 0 && <Row k={`خصم ${coupon?.code ?? ''}`} v={`− ${fmtSAR(pay.discount)}`} cls="text-forest-700" />}
            <Row k="المبلغ قبل الضريبة" v={fmtSAR(pay.subtotal)} />
            <Row k={`ضريبة القيمة المضافة ${pricing.vatRate}٪`} v={fmtSAR(pay.vat)} />
            <div className="border-t border-dashed border-line pt-3"><Row k="الإجمالي" v={fmtSAR(pay.total)} cls="font-display text-2xl font-black text-forest-900" /></div>
            {pay.status === 'PENDING' && <div className="pt-3"><CouponForm paymentId={pay.id} current={coupon?.code} /></div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
function Row({ k, v, cls }: { k: string; v: string; cls?: string }) { return <div className={`flex items-center justify-between ${cls ?? ''}`}><span className="text-muted">{k}</span><span className="num font-semibold">{v}</span></div>; }
