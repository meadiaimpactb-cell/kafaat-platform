import { redirect } from 'next/navigation';
import { BadgeCheck, CalendarRange, Layers, ShieldCheck } from 'lucide-react';
import { requireOrgUser } from '@/lib/auth';
import { PageHeader, Card, Button } from '@/components/ui';
import { createAssessmentRequest } from '@/app/actions/org';
import { quote } from '@/lib/payments';
import { requiredDocs } from '@/lib/workflow';
import { TRACK_LABEL, TRACK_RANGE, CORE_FACTORS } from '@/lib/domain';
import { fmtSAR, fmtDate } from '@/lib/format';
import { validUntilFor } from '@/lib/workflow';

export const metadata = { title: 'طلب تقييم' };
export default async function Page() {
  const u = await requireOrgUser();
  const o = u.org;
  if (!o.profileCompleted) redirect(`/portal/onboarding?org=${o.id}&need=1#docs`);
  const cycle = new Date().getFullYear() - 1;
  const q = await quote('CERTIFICATE');
  const docs = await requiredDocs(o.track ?? 'EMERGING');
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="الخطوة 2 من 7" title={`طلب تقييم السنة المالية ${cycle}`} subtitle="راجع تفاصيل الطلب، ثم انتقل إلى الدفع لتُفتح لك الأسئلة ورفع الملفات." />
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            {[{ i: <CalendarRange />, t: 'الفترة المقيّمة', v: `السنة المالية ${cycle}`, d: 'بتقرير العام الماضي وقوائمه المالية' },
              { i: <Layers />, t: 'المسار الحجمي', v: o.track ? TRACK_LABEL[o.track] : '—', d: o.track ? TRACK_RANGE[o.track] : '' },
              { i: <ShieldCheck />, t: 'صلاحية الشهادة', v: `حتى ${fmtDate(validUntilFor(cycle))}`, d: 'نهاية السنة الحالية' },
              { i: <BadgeCheck />, t: 'نوع النتيجة', v: 'تقييم مهني غير موثق', d: 'ويُوثق بزيارة تحقق وتقرير تعقيبي لاحقاً' }].map(x => (
              <div key={x.t} className="flex gap-3 rounded-2xl bg-forest-50 p-4"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-forest-700">{x.i}</div><div><div className="text-xs text-muted">{x.t}</div><div className="font-semibold">{x.v}</div><div className="text-xs text-muted">{x.d}</div></div></div>
            ))}
          </div>
          <div className="mt-7">
            <div className="mb-3 font-display font-semibold">الملفات التي ستحتاجها ({docs.length})</div>
            <ul className="grid gap-2 sm:grid-cols-2">
              {docs.map(d => <li key={d.id} className="flex items-center gap-2 text-sm"><span className={`size-2 rounded-full ${d.required ? 'bg-orange-brand' : 'bg-forest-300'}`} />{d.title}{d.required && <span className="text-xs text-muted">(أساسي)</span>}</li>)}
            </ul>
          </div>
        </Card>
        <Card className="h-fit p-7">
          <div className="text-sm text-muted">{q.label}</div>
          <div className="mt-2 font-display text-4xl font-black num">{fmtSAR(q.total)}</div>
          <div className="mt-1 text-xs text-muted">{q.includesVat ? `شامل ضريبة القيمة المضافة ${q.vatRate}٪ (${fmtSAR(q.vat)})` : `+ ضريبة ${q.vatRate}٪`}</div>
          <ul className="my-6 space-y-2 text-sm text-ink-2">
            {[`استبيان المعايير الـ${CORE_FACTORS} مع شرح لكل سؤال`, 'تقييم مهني من خلال خبراء معتمدين', 'مراسلة الخبير المراجع للاستفسار', 'الدرجة والمستوى وتقرير الفجوات'].map(t => <li key={t} className="flex gap-2"><BadgeCheck className="size-4 text-forest-600" />{t}</li>)}
          </ul>
          <form action={createAssessmentRequest}><Button variant="lime" size="lg" className="w-full">تأكيد الطلب والمتابعة للدفع</Button></form>
          <p className="mt-3 text-center text-xs text-muted">يمكنك إدخال كود خصم في صفحة الدفع</p>
        </Card>
      </div>
    </div>
  );
}
