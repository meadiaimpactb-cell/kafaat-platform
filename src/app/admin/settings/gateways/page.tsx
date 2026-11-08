import { CreditCard, FlaskConical, Landmark, Wallet, Webhook } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { getGateways, GATEWAY_FIELDS, GATEWAY_INFO } from '@/lib/payments';
import { mask } from '@/lib/crypto';
import { PageHeader, Card, Badge } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveGateway } from '@/app/actions/admin';

export const metadata = { title: 'بوابات الدفع' };
const ICON = { sandbox: FlaskConical, moyasar: CreditCard, tap: Wallet, bank_transfer: Landmark } as Record<string, typeof CreditCard>;
export default async function Page() {
  await requireStaff('settings.gateways');
  const gws = await getGateways();
  const app = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="بوابات الدفع" subtitle="أدخل مفاتيح البوابة وفعّلها، فتظهر للعملاء في صفحة الدفع مباشرة، وتتحقق المنصة من كل دفعة لدى البوابة وتنعكس على الطلب آلياً. المفاتيح تُحفظ مشفرة." />
      <div className="space-y-5">
        {gws.map(g => { const I = ICON[g.id] ?? CreditCard; const info = GATEWAY_INFO[g.id]; const fields = GATEWAY_FIELDS[g.id] ?? []; return (
          <Card key={g.id} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 border-b border-line p-5">
              <div className={`grid size-12 place-items-center rounded-2xl ${g.enabled ? 'bg-forest-800 text-lime-brand' : 'bg-forest-50 text-forest-600'}`}><I className="size-6" /></div>
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2 font-display text-lg font-semibold">{info?.title ?? g.name}{g.enabled ? <Badge tone="green" dot>مفعّلة</Badge> : <Badge>معطّلة</Badge>}{g.enabled && g.id !== 'bank_transfer' && <Badge tone={g.mode === 'LIVE' ? 'violet' : 'amber'}>{g.mode === 'LIVE' ? 'إنتاج' : 'اختبار'}</Badge>}</div><div className="text-sm text-muted">{info?.desc}</div><div className="text-xs text-muted">{info?.methods}</div></div>
            </div>
            <ActionForm action={saveGateway} className="space-y-4 p-5">
              <input type="hidden" name="id" value={g.id} />
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="enabled" defaultChecked={g.enabled} className="size-5 accent-forest-700" /> تفعيل البوابة</label>
                {fields.length > 0 && <div className="flex items-center gap-2 text-sm"><span className="text-muted">الوضع:</span><label className="flex items-center gap-1"><input type="radio" name="mode" value="TEST" defaultChecked={g.mode !== 'LIVE'} className="accent-forest-700" /> اختبار</label><label className="flex items-center gap-1"><input type="radio" name="mode" value="LIVE" defaultChecked={g.mode === 'LIVE'} className="accent-forest-700" /> إنتاج</label></div>}
              </div>
              {fields.length > 0 && <div className="grid gap-4 md:grid-cols-2">{fields.map(f => <label key={f.key}><span className="label">{f.label}</span><input name={f.key} defaultValue={f.secret ? mask(g.config[f.key] ?? '') : g.config[f.key] ?? ''} className="input ltr font-mono text-sm" placeholder={f.secret ? 'اتركه كما هو للإبقاء على المفتاح الحالي' : ''} autoComplete="off" />{f.help && <span className="mt-1 block text-xs text-muted">{f.help}</span>}</label>)}</div>}
              {(g.id === 'moyasar' || g.id === 'tap') && <div className="flex items-start gap-2 rounded-xl bg-forest-50 p-3 text-xs leading-5"><Webhook className="mt-0.5 size-4 shrink-0 text-forest-700" /><div>رابط الإشعارات (Webhook) لإضافته في لوحة {info?.title}: <code className="ltr inline-block rounded bg-white px-1.5 py-0.5">{app}/api/webhooks/{g.id}</code><br />رابط العودة بعد الدفع يُرسل تلقائياً مع كل عملية.</div></div>}
              {g.id === 'sandbox' && <p className="text-xs text-muted">مفيدة للتجربة والتدريب. عطّلها قبل الإطلاق الرسمي.</p>}
              {g.id === 'bank_transfer' && <p className="text-xs text-muted">تُعرض بيانات الحساب من «الأسعار والفوترة». يرفع العميل الإيصال، وتعتمده من «المدفوعات».</p>}
              <Submit size="sm">حفظ</Submit>
            </ActionForm>
          </Card>
        ); })}
      </div>
    </div>
  );
}
