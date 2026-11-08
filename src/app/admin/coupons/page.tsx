import { desc } from 'drizzle-orm';
import { TicketPercent } from 'lucide-react';
import { db, coupons } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Card, CardTitle, Table, Td, Badge } from '@/components/ui';
import { ActionForm, ActionButton } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveCoupon, toggleCoupon } from '@/app/actions/admin';
import { fmtDate, fmtSAR } from '@/lib/format';

export const metadata = { title: 'أكواد الخصم' };
function CouponFields({ c }: { c?: typeof coupons.$inferSelect }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <label><span className="label">الكود</span><input name="code" defaultValue={c?.code} className="input ltr uppercase" placeholder="RAMADAN30" /></label>
      <label><span className="label">النوع</span><select name="type" defaultValue={c?.type ?? 'PERCENT'} className="input"><option value="PERCENT">نسبة مئوية ٪</option><option value="FIXED">مبلغ ثابت (ر.س)</option></select></label>
      <label><span className="label">القيمة</span><input name="value" type="number" step="0.01" defaultValue={c?.value} className="input num" /></label>
      <label><span className="label">الخدمة</span><select name="product" defaultValue={c?.product ?? 'ALL'} className="input"><option value="ALL">كل الخدمات</option><option value="CERTIFICATE">التقييم والشهادة</option><option value="VERIFICATION_VISIT">زيارة التحقق</option></select></label>
      <label><span className="label">حد الاستخدام</span><input name="maxUses" type="number" defaultValue={c?.maxUses ?? ''} className="input num" placeholder="غير محدود" /></label>
      <label><span className="label">ينتهي في</span><input name="expiresAt" type="date" defaultValue={c?.expiresAt ? c.expiresAt.toISOString().slice(0, 10) : ''} className="input ltr" /></label>
      <label className="lg:col-span-2"><span className="label">ملاحظة داخلية</span><input name="note" defaultValue={c?.note ?? ''} className="input" placeholder="مثال: شراكة مع مؤسسة مانحة" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={c?.active ?? true} className="size-4 accent-forest-700" /> مفعّل</label>
    </div>
  );
}
export default async function Page() {
  await requireStaff('coupons.manage');
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));
  return (
    <div className="space-y-6">
      <PageHeader title="أكواد الخصم" subtitle="أنشئ كوداً هنا فيصبح قابلاً للاستخدام فوراً في صفحة الدفع، ويُحتسب الخصم والضريبة تلقائياً." />
      <Card className="p-6"><CardTitle title="كود جديد" icon={<TicketPercent className="size-5" />} /><ActionForm action={saveCoupon} resetOnOk className="mt-5 space-y-4"><CouponFields /><Submit>إنشاء الكود</Submit></ActionForm></Card>
      <Table head={['الكود', 'الخصم', 'الخدمة', 'الاستخدام', 'ينتهي', 'الحالة', '']}>
        {rows.map(c => <tr key={c.id}>
          <Td className="ltr text-right font-mono font-bold">{c.code}{c.note && <div className="font-sans text-xs font-normal text-muted">{c.note}</div>}</Td>
          <Td className="num font-semibold">{c.type === 'PERCENT' ? `${c.value}٪` : fmtSAR(c.value)}</Td>
          <Td className="text-sm">{c.product === 'ALL' ? 'الكل' : c.product === 'CERTIFICATE' ? 'التقييم' : 'الزيارة'}</Td>
          <Td className="num">{c.used}{c.maxUses != null ? ` / ${c.maxUses}` : ''}</Td><Td>{c.expiresAt ? fmtDate(c.expiresAt) : '—'}</Td>
          <Td>{c.active ? <Badge tone="green" dot>مفعّل</Badge> : <Badge>معطّل</Badge>}</Td>
          <Td><div className="flex items-center gap-2"><ActionButton action={toggleCoupon.bind(null, c.id)} size="sm" variant="ghost">{c.active ? 'تعطيل' : 'تفعيل'}</ActionButton>
            <details className="relative"><summary className="cursor-pointer list-none text-sm font-semibold text-forest-700">تعديل</summary><div className="absolute left-0 z-10 mt-2 w-[min(90vw,48rem)] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-line"><ActionForm action={saveCoupon} className="space-y-4"><CouponFields c={c} /><Submit size="sm">حفظ</Submit></ActionForm></div></details></div></Td>
        </tr>)}
      </Table>
    </div>
  );
}
