import { requireStaff } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { SOCIAL, callbackUrl } from '@/lib/social';
import { PageHeader, Card, CardTitle, Badge } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveSocial } from '@/app/actions/admin';

export const metadata = { title: 'تسجيل الدخول الاجتماعي' };
export default async function Page() {
  await requireStaff('settings.social');
  const cfg = await getSetting('social');
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="تسجيل الدخول عبر Google وFacebook وLinkedIn" subtitle="أنشئ تطبيقاً لدى كل مزوّد، وضع رابط إعادة التوجيه المعروض أدناه، ثم الصق المعرّف والسر. يُخزَّن السر مشفراً، ولا يظهر زر المزوّد العامل إلا بعد تفعيله." />
      <ActionForm action={saveSocial} className="space-y-6">
        {(['google', 'facebook', 'linkedin'] as const).map(k => {
          const c = cfg[k]; const meta = SOCIAL[k]; const envOk = !!(process.env[meta.env[0]] && process.env[meta.env[1]]);
          return (
            <Card key={k} className="p-6">
              <CardTitle title={meta.name} action={c.enabled ? <Badge tone="green" dot>مفعّل</Badge> : envOk ? <Badge tone="sky">مفاتيح البيئة متاحة</Badge> : <Badge tone="slate">معطّل</Badge>} />
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name={`${k}_enabled`} defaultChecked={c.enabled} className="size-4 accent-forest-700" /> تفعيل الدخول عبر {meta.name}</label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label><span className="label">معرّف العميل (Client ID)</span><input name={`${k}_id`} defaultValue={c.clientId} className="input ltr" autoComplete="off" /></label>
                  <label><span className="label">السر (Client Secret)</span><input name={`${k}_secret`} type="password" defaultValue={c.clientSecret ? '••••••••••••' : ''} className="input ltr" autoComplete="new-password" /></label>
                </div>
                <div className="rounded-xl bg-forest-50 p-3 text-xs leading-6"><div className="text-muted">رابط إعادة التوجيه المعتمد (Redirect URI) — انسخه كما هو في إعدادات المزوّد:</div><code className="ltr block select-all break-all font-mono text-forest-900">{callbackUrl(k)}</code><a href={meta.docs} target="_blank" className="mt-1 inline-block text-forest-800 underline">لوحة المطورين لدى {meta.name}</a>{envOk && <div className="mt-1 text-muted">تُستخدم متغيرات البيئة {meta.env.join(' / ')} كبديل عند ترك الحقول فارغة.</div>}</div>
              </div>
            </Card>
          );
        })}
        <Submit size="lg">حفظ الإعدادات</Submit>
      </ActionForm>
    </div>
  );
}
