import { desc, eq } from 'drizzle-orm';
import { db, activityLogs, users } from '@/db';
import { requireStaff } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { quote } from '@/lib/payments';
import { PageHeader, Card, CardTitle } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { savePricing } from '@/app/actions/admin';
import { fmtSAR, fmtDate } from '@/lib/format';

export const metadata = { title: 'الأسعار والفوترة' };
export default async function Page() {
  await requireStaff('settings.pricing');
  const [p, seller, bank, general, q1, q2] = await Promise.all([getSetting('pricing'), getSetting('seller'), getSetting('bank'), getSetting('general'), quote('CERTIFICATE'), quote('VERIFICATION_VISIT')]);
  const hist = await db.select({ l: activityLogs, who: users.name }).from(activityLogs).leftJoin(users, eq(users.id, activityLogs.userId)).where(eq(activityLogs.action, 'settings.pricing')).orderBy(desc(activityLogs.createdAt)).limit(10);
  type PD = { certificate: number; visit: number; vatRate: number };
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="الأسعار والفوترة" subtitle="غيّر أسعار الخدمات من هنا وتنعكس على الموقع العام وصفحات الدفع والطلبات الجديدة فوراً. الدفعات القائمة تحتفظ بسعرها وقت الطلب." />
      <ActionForm action={savePricing} className="space-y-6">
        <Card className="p-6">
          <CardTitle title="أسعار الخدمات" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className="label">التقييم المهني وشهادة كفاءة الأثر (ر.س)</span><input name="certificate" type="number" min="0" defaultValue={p.certificate} className="input num" /><span className="mt-1 block text-xs text-muted">السعر الأساسي للتقييم</span></label>
            <label><span className="label">التوثيق: زيارة التحقق والتقرير التعقيبي (ر.س)</span><input name="visit" type="number" min="0" defaultValue={p.visit} className="input num" /><span className="mt-1 block text-xs text-muted">يشمل التقرير التعقيبي</span></label>
            <label><span className="label">نسبة الضريبة ٪</span><input name="vatRate" type="number" step="0.01" defaultValue={p.vatRate} className="input num" /></label>
            <label className="flex items-end gap-2 pb-3 text-sm"><input type="checkbox" name="pricesIncludeVat" defaultChecked={p.pricesIncludeVat} className="size-4 accent-forest-700" /> الأسعار شاملة الضريبة</label>
          </div>
          <div className="mt-4 grid gap-3 rounded-2xl bg-forest-50 p-4 text-sm sm:grid-cols-2">
            <div>التقييم: يدفع العميل <b className="num">{fmtSAR(q1.total)}</b> (قبل الضريبة {fmtSAR(q1.subtotal)} + ضريبة {fmtSAR(q1.vat)})</div>
            <div>التوثيق (يشمل التقرير التعقيبي): يدفع العميل <b className="num">{fmtSAR(q2.total)}</b> (قبل الضريبة {fmtSAR(q2.subtotal)} + ضريبة {fmtSAR(q2.vat)})</div>
          </div>
        </Card>
        <Card className="p-6">
          <CardTitle title="بيانات البائع في الفاتورة الضريبية" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label><span className="label">الاسم النظامي</span><input name="sellerName" defaultValue={seller.name} className="input" /></label>
            <label><span className="label">الرقم الضريبي</span><input name="vatNumber" defaultValue={seller.vatNumber} className="input ltr" placeholder="3xxxxxxxxxxxxx3" /></label>
            <label><span className="label">السجل التجاري / الترخيص</span><input name="crNumber" defaultValue={seller.crNumber} className="input ltr" /></label>
            <label className="lg:col-span-3"><span className="label">العنوان</span><input name="address" defaultValue={seller.address} className="input" /></label>
            <label><span className="label">البريد</span><input name="sellerEmail" defaultValue={seller.email} className="input ltr" /></label>
            <label><span className="label">الهاتف</span><input name="sellerPhone" defaultValue={seller.phone} className="input ltr" /></label>
          </div>
        </Card>
        <Card className="p-6">
          <CardTitle title="الحساب البنكي للتحويل" />
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">البنك</span><input name="bankName" defaultValue={bank.bankName} className="input" /></label>
            <label><span className="label">اسم المستفيد</span><input name="accountName" defaultValue={bank.accountName} className="input" /></label>
            <label><span className="label">الآيبان</span><input name="iban" defaultValue={bank.iban} className="input ltr" placeholder="SA00 0000 0000 0000 0000 0000" /></label>
            <label><span className="label">تعليمات</span><input name="bankNote" defaultValue={bank.note} className="input" /></label>
          </div>
        </Card>
        <Card className="p-6">
          <CardTitle title="عام" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className="label">اسم المنصة</span><input name="platformName" defaultValue={general.platformName} className="input" /></label>
            <label><span className="label">بريد الدعم</span><input name="supportEmail" defaultValue={general.supportEmail} className="input ltr" /></label>
            <label><span className="label">هاتف الدعم</span><input name="supportPhone" defaultValue={general.supportPhone} className="input ltr" /></label>
            <label><span className="label">حجم عينة الزيارة</span><input name="visitSampleSize" type="number" defaultValue={general.visitSampleSize} className="input num" /></label>
          </div>
        </Card>
        <Submit size="lg">حفظ كل الإعدادات</Submit>
      </ActionForm>
      <Card className="mt-6 p-6">
        <CardTitle title="سجل تغييرات الأسعار" subtitle="آخر 10 تغييرات: من غيّر وماذا تغيّر" />
        <ul className="mt-4 divide-y divide-line text-sm">
          {hist.map(({ l, who }) => { const d = l.details as { before: PD; after: PD }; return <li key={l.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-2.5"><span className="text-muted">{fmtDate(l.createdAt, true)}</span><span className="font-semibold">{who ?? '—'}</span><span>التقييم: <span className="num text-muted line-through">{d.before?.certificate}</span> ← <b className="num">{d.after?.certificate}</b></span><span>التوثيق: <span className="num text-muted line-through">{d.before?.visit}</span> ← <b className="num">{d.after?.visit}</b></span></li>; })}
          {!hist.length && <li className="py-2 text-muted">لا تغييرات مسجلة بعد.</li>}
        </ul>
      </Card>
    </div>
  );
}
