'use client';
import { useActionState, useState } from 'react';
import { CreditCard, FlaskConical, Landmark, TicketPercent, Upload, Wallet } from 'lucide-react';
import { applyCouponAction, checkoutAction, uploadReceipt } from '@/app/actions/org';
import { Submit, FormMessage } from '@/components/client/submit';
import { cn } from '@/lib/cn';

const ICON: Record<string, typeof CreditCard> = { sandbox: FlaskConical, moyasar: CreditCard, tap: Wallet, bank_transfer: Landmark };

export function CouponForm({ paymentId, current }: { paymentId: string; current?: string | null }) {
  const [state, action] = useActionState(applyCouponAction, {});
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="label"><span className="inline-flex items-center gap-1.5"><TicketPercent className="size-4" /> كود الخصم</span></div>
      <div className="flex gap-2">
        <input name="code" defaultValue={current ?? ''} placeholder="مثال: LAUNCH25" className="input ltr flex-1 uppercase" />
        <Submit variant="outline" pendingText="…">{current ? 'تحديث' : 'تطبيق'}</Submit>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function CheckoutForm({ paymentId, gateways, free, error }: { paymentId: string; free: boolean; error?: string; gateways: { id: string; title: string; desc: string; methods: string; test: boolean }[] }) {
  const [state, action] = useActionState(checkoutAction, error ? { error } : {});
  const [sel, setSel] = useState(gateways[0]?.id ?? '');
  if (free) return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="rounded-2xl bg-lime-100 p-4 text-sm text-forest-900">كود الخصم يغطي المبلغ كاملاً، لا حاجة لوسيلة دفع.</div>
      <Submit variant="lime" size="lg" className="w-full" pendingText="جارٍ التفعيل…">تأكيد وتفعيل الطلب</Submit>
      <FormMessage state={state} />
    </form>
  );
  if (!gateways.length) return <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">لا توجد وسيلة دفع مفعّلة حالياً. تواصل مع الدعم.</div>;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="paymentId" value={paymentId} />
      <div className="grid gap-3">
        {gateways.map(g => { const I = ICON[g.id] ?? CreditCard; const on = sel === g.id; return (
          <label key={g.id} className={cn('flex cursor-pointer items-start gap-4 rounded-2xl border-2 p-4 transition', on ? 'border-forest-700 bg-forest-50' : 'border-line hover:border-forest-300')}>
            <input type="radio" name="gateway" value={g.id} checked={on} onChange={() => setSel(g.id)} className="sr-only" />
            <div className={cn('grid size-11 shrink-0 place-items-center rounded-xl', on ? 'bg-forest-800 text-white' : 'bg-forest-50 text-forest-700')}><I className="size-5" /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold">{g.title}{g.test && g.id !== 'bank_transfer' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">وضع اختبار</span>}</div>
              <div className="text-xs text-muted">{g.methods}</div>
              <div className="mt-1 text-xs leading-5 text-ink-2">{g.desc}</div>
            </div>
            <span className={cn('mt-1 size-5 shrink-0 rounded-full border-2', on ? 'border-forest-700 bg-forest-700 shadow-[inset_0_0_0_3px_#fff]' : 'border-line')} />
          </label>
        ); })}
      </div>
      <Submit variant="lime" size="lg" className="w-full" pendingText="جارٍ التحويل لبوابة الدفع…">{sel === 'bank_transfer' ? 'عرض بيانات التحويل' : 'ادفع الآن'}</Submit>
      <FormMessage state={state} />
    </form>
  );
}

export function ReceiptForm({ paymentId }: { paymentId: string }) {
  const [state, action] = useActionState(uploadReceipt, {});
  const [name, setName] = useState('');
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="paymentId" value={paymentId} />
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-forest-300 bg-white p-6 text-center hover:bg-forest-50">
        <Upload className="size-6 text-forest-700" />
        <span className="font-semibold">{name || 'ارفع إيصال التحويل'}</span>
        <span className="text-xs text-muted">PDF أو صورة · حتى 30 م.ب</span>
        <input type="file" name="receipt" accept=".pdf,image/*" className="sr-only" onChange={e => setName(e.target.files?.[0]?.name ?? '')} />
      </label>
      <Submit className="w-full" pendingText="جارٍ الرفع…">إرسال الإيصال للاعتماد</Submit>
      <FormMessage state={state} />
    </form>
  );
}
