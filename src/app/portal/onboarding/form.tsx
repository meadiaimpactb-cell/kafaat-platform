'use client';
import { useActionState, useState } from 'react';
import { Building2, MapPin, Wallet, ArrowLeft, ArrowRight } from 'lucide-react';
import { saveOrgProfile } from '@/app/actions/org';
import { Submit, FormMessage } from '@/components/client/submit';
import { Button } from '@/components/ui';
import { REGIONS, FIELDS, TRACK_LABEL, TRACK_RANGE } from '@/lib/domain';
import { trackOf } from '@/lib/scoring';
import { cn } from '@/lib/cn';

type Org = Record<string, string | number | null>;
const STEPS = [{ t: 'هوية الجهة', i: Building2 }, { t: 'التواصل والموقع', i: MapPin }, { t: 'الحجم والمالية', i: Wallet }];

/** معرّف خارج المكوّن حتى لا يُعاد تركيب الحقول فتضيع قيمها عند التنقل بين الخطوات */
function Field0({ k, label, type = 'text', req, ph, ltr, hint, dv }: { k: string; label: string; type?: string; req?: boolean; ph?: string; ltr?: boolean; hint?: string; dv: string }) {
  return <label className="block"><span className="label">{label}{req && <span className="text-orange-brand"> *</span>}</span><input name={k} type={type} defaultValue={dv} placeholder={ph} className={cn('input', ltr && 'ltr text-left')} />{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label>;
}

export function OnboardingForm({ org, first }: { org: Org; first: boolean }) {
  const [s, action] = useActionState(saveOrgProfile, undefined);
  const [step, setStep] = useState(0);
  const [exp, setExp] = useState(String(org.lastYearExpenses ?? ''));
  const v = (k: string) => (s?.fields?.[k] ?? org[k] ?? '') as string;
  const expNum = Number(exp.replace(/[,\s]/g, ''));
  const track = expNum > 0 ? trackOf(expNum) : null;
  return (
    <form action={action} className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {STEPS.map((x, i) => (
          <button type="button" key={x.t} onClick={() => setStep(i)} className={cn('flex items-center gap-3 rounded-2xl border p-4 text-right transition', i === step ? 'border-forest-700 bg-forest-800 text-white shadow-lg' : i < step ? 'border-forest-300 bg-forest-50' : 'border-line bg-white')}>
            <div className={cn('grid size-10 place-items-center rounded-xl', i === step ? 'bg-lime-brand text-forest-950' : 'bg-forest-100 text-forest-800')}><x.i className="size-5" /></div>
            <div><div className={cn('text-xs', i === step ? 'text-white/60' : 'text-muted')}>الخطوة {i + 1}</div><div className="font-semibold">{x.t}</div></div>
          </button>
        ))}
      </div>
      <FormMessage state={s} />
      <div className="card p-6 md:p-8">
        <div className={cn('grid gap-5 md:grid-cols-2', step !== 0 && 'hidden')}>
          <Field0 dv={v('name')} k="name" label="اسم الجهة" req />
          <Field0 dv={v('nameEn')} k="nameEn" label="الاسم بالإنجليزية" ltr />
          <label className="block"><span className="label">نوع الجهة <span className="text-orange-brand">*</span></span><select name="orgType" defaultValue={v('orgType')} className="input"><option value="">اختر</option>{['جمعية أهلية', 'مؤسسة أهلية', 'وقف', 'جمعية تعاونية', 'جهة غير ربحية أخرى'].map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="block"><span className="label">المجال الرئيس <span className="text-orange-brand">*</span></span><select name="field" defaultValue={v('field')} className="input"><option value="">اختر</option>{FIELDS.map(x => <option key={x}>{x}</option>)}</select></label>
          <Field0 dv={v('licenseNo')} k="licenseNo" label="رقم الترخيص" req hint="لدى المركز الوطني لتنمية القطاع غير الربحي" />
          <Field0 dv={v('unifiedNo')} k="unifiedNo" label="الرقم الموحد" />
          <Field0 dv={v('foundedYear')} k="foundedYear" label="سنة التأسيس" type="number" />
          <Field0 dv={v('website')} k="website" label="الموقع الإلكتروني" ltr ph="https://" />
          <label className="block md:col-span-2"><span className="label">نبذة عن الجهة وبرامجها</span><textarea name="description" defaultValue={v('description')} rows={3} className="input" /></label>
        </div>
        <div className={cn('grid gap-5 md:grid-cols-2', step !== 1 && 'hidden')}>
          <label className="block"><span className="label">المنطقة <span className="text-orange-brand">*</span></span><select name="region" defaultValue={v('region')} className="input"><option value="">اختر</option>{REGIONS.map(x => <option key={x}>{x}</option>)}</select></label>
          <Field0 dv={v('city')} k="city" label="المدينة" req />
          <Field0 dv={v('address')} k="address" label="العنوان" />
          <Field0 dv={v('phone')} k="phone" label="هاتف الجهة" ltr />
          <Field0 dv={v('email')} k="email" label="البريد الرسمي" type="email" ltr />
          <Field0 dv={v('contactName')} k="contactName" label="مسؤول التواصل" />
          <Field0 dv={v('contactTitle')} k="contactTitle" label="المسمى الوظيفي" />
        </div>
        <div className={cn('space-y-6', step !== 2 && 'hidden')}>
          <div className="grid gap-5 md:grid-cols-2">
            <label className="block"><span className="label">إجمالي مصروفات آخر سنة مالية (ريال) <span className="text-orange-brand">*</span></span><input name="lastYearExpenses" value={exp} onChange={e => setExp(e.target.value)} inputMode="numeric" className="input ltr text-left num" placeholder="12,400,000" /><span className="mt-1 block text-xs text-muted">من القوائم المالية للسنة المالية {new Date().getFullYear() - 1}، ويحدد مسارك الحجمي</span></label>
            <div className={cn('rounded-2xl border p-4 transition', track ? 'border-forest-300 bg-forest-50' : 'border-dashed border-line')}>
              <div className="text-xs text-muted">المسار الحجمي</div>
              <div className="mt-1 font-display text-2xl font-bold text-forest-800">{track ? TRACK_LABEL[track] : '—'}</div>
              <div className="text-sm text-muted">{track ? TRACK_RANGE[track] : 'اكتب المصروفات لتحديد المسار'}</div>
            </div>
            <Field0 dv={v('lastYearRevenue')} k="lastYearRevenue" label="إجمالي الإيرادات (ريال)" ltr />
            <Field0 dv={v('programExpenses')} k="programExpenses" label="مصروفات البرامج (ريال)" ltr />
            <Field0 dv={v('beneficiariesCount')} k="beneficiariesCount" label="عدد المستفيدين" type="number" ltr />
            <Field0 dv={v('programsCount')} k="programsCount" label="عدد البرامج" type="number" ltr />
            <Field0 dv={v('employeesCount')} k="employeesCount" label="عدد الموظفين" type="number" ltr />
            <Field0 dv={v('volunteersCount')} k="volunteersCount" label="عدد المتطوعين" type="number" ltr />
            <label className="block"><span className="label">نهاية السنة المالية</span><select name="fiscalYearEnd" defaultValue={v('fiscalYearEnd') || '12-31'} className="input"><option value="12-31">31 ديسمبر</option><option value="06-30">30 يونيو</option><option value="03-31">31 مارس</option></select></label>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}><ArrowRight className="size-4" /> السابق</Button>
        {step < 2 ? <Button type="button" onClick={() => setStep(step + 1)}>التالي <ArrowLeft className="size-4" /></Button> : (
          <div className="flex gap-2">
            {!first && <Submit variant="outline">حفظ</Submit>}
            <Submit name="then" value="request" variant="lime" size="lg">{first ? 'حفظ والمتابعة لطلب التقييم' : 'حفظ وطلب التقييم'} <ArrowLeft className="size-5" /></Submit>
          </div>
        )}
      </div>
    </form>
  );
}
