import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { FlaskConical, Lock } from 'lucide-react';
import { db, payments } from '@/db';
import { requireUser, ownsOrg } from '@/lib/auth';
import { sandboxPay } from '@/app/actions/org';
import { Submit } from '@/components/client/submit';
import { fmtSAR } from '@/lib/format';
import { PRODUCT_LABEL } from '@/lib/domain';

export const metadata = { title: 'بوابة الدفع التجريبية' };
export default async function Page({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const u = await requireUser(['ORG_USER']);
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!pay || !ownsOrg(u, pay.orgId)) notFound();
  if (pay.status === 'PAID') redirect(`/portal/assessments/${pay.assessmentId}`);
  return (
    <div className="grid min-h-screen place-items-center bg-[#0f1720] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-l from-slate-900 to-slate-700 px-6 py-5 text-white">
          <div><div className="text-xs text-white/60">بوابة دفع تجريبية</div><div className="font-display text-lg font-bold">Sandbox Pay</div></div>
          <FlaskConical className="size-7 text-amber-300" />
        </div>
        <div className="space-y-5 p-6">
          <div className="rounded-2xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">هذه بوابة لمحاكاة الدفع أثناء الاختبار. لا تُخصم أي مبالغ. فعّل ميسر أو تاب من لوحة التحكم للدفع الحقيقي.</div>
          <div className="flex items-end justify-between"><div><div className="text-xs text-muted">{PRODUCT_LABEL[pay.product]}</div><div className="ltr text-right text-xs text-muted">{pay.number}</div></div><div className="font-display text-3xl font-black num">{fmtSAR(pay.total)}</div></div>
          <div className="relative h-44 rounded-2xl bg-gradient-to-br from-forest-800 via-forest-700 to-lime-600 p-5 text-white shadow-lg">
            <div className="flex justify-between"><div className="h-8 w-11 rounded-md bg-amber-200/80" /><span className="font-display font-bold italic">mada</span></div>
            <div className="ltr mt-7 font-mono text-xl tracking-[.2em]">4111 1111 1111 1111</div>
            <div className="ltr mt-4 flex justify-between font-mono text-xs uppercase text-white/80"><span>{u.name}</span><span>12/30</span></div>
          </div>
          <form action={sandboxPay} className="grid grid-cols-2 gap-3">
            <input type="hidden" name="paymentId" value={pay.id} />
            <Submit name="outcome" value="success" variant="lime" size="lg" className="col-span-2" pendingText="جارٍ المعالجة…"><Lock className="size-4" /> ادفع {fmtSAR(pay.total)}</Submit>
            <button name="outcome" value="fail" className="col-span-2 text-sm text-rose-600 hover:underline">محاكاة فشل الدفع</button>
          </form>
        </div>
      </div>
    </div>
  );
}
