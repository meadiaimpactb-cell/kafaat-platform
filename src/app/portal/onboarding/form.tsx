'use client';
import { useActionState, useState } from 'react';
import { Building2, MapPin, UserCheck, Wallet, ArrowLeft, ArrowRight, BadgeCheck } from 'lucide-react';
import { saveOrgProfile } from '@/app/actions/org';
import { Submit, FormMessage } from '@/components/client/submit';
import { Button } from '@/components/ui';
import { REGIONS, FIELDS, TRACK_LABEL, TRACK_RANGE } from '@/lib/domain';
import { ORG_TYPES, LICENSE_ISSUERS } from '@/lib/org-meta';
import { trackOf } from '@/lib/scoring';
import { cn } from '@/lib/cn';

type Org = Record<string, string | number | null>;
const STEPS = [{ t: 'هوية الجهة وترخيصها', i: Building2 }, { t: 'التواصل والموقع', i: MapPin }, { t: 'الممثل المفوض', i: UserCheck }, { t: 'الحجم والمالية', i: Wallet }];
const dateVal = (v: unknown) => (v ? String(v).slice(0, 10) : '');

/** معرّف خارج المكوّن حتى لا يُعاد تركيب الحقول فتضيع قيمها عند التنقل بين الخطوات */
function Field0({ k, label, type = 'text', req, ph, ltr, hint, dv }: { k: string; label: string; type?: string; req?: boolean; ph?: string; ltr?: boolean; hint?: string; dv: string }) {
  return <label className="block"><span className="label">{label}{req && <span className="text-orange-brand"> *</span>}</span><input name={k} type={type} defaultValue={dv} placeholder={ph} className={cn('input', ltr && 'ltr text-left')} />{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label>;
}

export function OnboardingForm({ org, orgId, complete }: { org: Org; orgId: string | null; complete: boolean }) {
  const [s, action] = useActionState(saveOrgProfile, undefined);
  const [step, setStep] = useState(0);
  const [exp, setExp] = useState(String(org.lastYearExpenses ?? ''));
  const v = (k: string) => (s?.fields?.[k] ?? org[k] ?? '') as string;
  const expNum = Number(exp.replace(/[,\s]/g, ''));
  const track = expNum > 0 ? trackOf(expNum) : null;
  const last = STEPS.length - 1;
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="orgId" value={orgId ?? ''} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {STEPS.map((x, i) => (
          <button type="button" key={x.t} onClick={() => setStep(i)} className={cn('flex items-center gap-3 rounded-2xl border p-3.5 text-right transition', i === step ? 'border-forest-700 bg-forest-800 text-white shadow-lg' : i < step ? 'border-forest-300 bg-forest-50' : 'border-line bg-white')}>
            <div className={cn('grid size-9 shrink-0 place-items-center rounded-xl', i === step ? 'bg-lime-brand text-forest-950' : 'bg-forest-100 text-forest-800')}><x.i className="size-[18px]" /></div>
            <div className="min-w-0"><div className={cn('text-[11px]', i === step ? 'text-white/60' : 'text-muted')}>الخطوة {i + 1}</div><div className="text-sm font-semibold leading-5">{x.t}</div></div>
          </button>
        ))}
      </div>
      <FormMessage state={s} />
      <div className="card p-6 md:p-8">
        <div className={cn('grid gap-5 md:grid-cols-2', step !== 0 && 'hidden')}>
          <Field0 dv={v('name')} k="name" label="اسم الجهة (كما في الترخيص)" req />
          <Field0 dv={v('nameEn')} k="nameEn" label="الاسم بالإنجليزية" ltr />
          <label className="block"><span className="label">نوع الجهة <span className="text-orange-brand">*</span></span><select name="orgType" defaultValue={v('orgType')} className="input"><option value="">اختر</option>{ORG_TYPES.map(x => <option key={x}>{x}</option>)}</select></label>
          <label className="block"><span className="label">المجال الرئيس <span className="text-orange-brand">*</span></span><select name="field" defaultValue={v('field')} className="input"><option value="">اختر</option>{FIELDS.map(x => <option key={x}>{x}</option>)}</select></label>
          <div className="rounded-2xl bg-forest-50 p-4 md:col-span-2">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-forest-900"><BadgeCheck className="size-4" /> بيانات الترخيص — تُطابَق مع المستند المرفوع عند التوثيق</div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field0 dv={v('licenseNo')} k="licenseNo" label="رقم الترخيص / التسجيل" req ltr />
              <label className="block"><span className="label">جهة الترخيص <span className="text-orange-brand">*</span></span><select name="licenseIssuer" defaultValue={v('licenseIssuer')} className="input"><option value="">اختر</option>{LICENSE_ISSUERS.map(x => <option key={x}>{x}</option>)}</select></label>
              <Field0 dv={dateVal(v('licenseIssueDate'))} k="licenseIssueDate" label="تاريخ إصدار الترخيص" type="date" req ltr />
              <Field0 dv={dateVal(v('licenseExpiry'))} k="licenseExpiry" label="تاريخ انتهاء الترخيص" type="date" ltr hint="إن كان الترخيص بلا تاريخ انتهاء فاتركه فارغاً" />
              <Field0 dv={v('unifiedNo')} k="unifiedNo" label="الرقم الوطني الموحد (700…)" ltr />
              <Field0 dv={v('foundedYear')} k="foundedYear" label="سنة التأسيس" type="number" ltr />
            </div>
          </div>
          <label className="block md:col-span-2"><span className="label">نبذة عن الجهة وبرامجها</span><textarea name="description" defaultValue={v('description')} rows={3} className="input" /></label>
        </div>
        <div className={cn('grid gap-5 md:grid-cols-2', step !== 1 && 'hidden')}>
          <label className="block"><span className="label">المنطقة <span className="text-orange-brand">*</span></span><select name="region" defaultValue={v('region')} className="input"><option value="">اختر</option>{REGIONS.map(x => <option key={x}>{x}</option>)}</select></label>
          <Field0 dv={v('city')} k="city" label="المدينة" req />
          <Field0 dv={v('address')} k="address" label="عنوان الجهة (الحي والشارع)" req />
          <Field0 dv={v('nationalAddress')} k="nationalAddress" label="العنوان الوطني المختصر" ltr ph="RRRD2929" hint="4 أحرف و4 أرقام" />
          <Field0 dv={v('phone')} k="phone" label="هاتف الجهة" req ltr ph="05xxxxxxxx" />
          <Field0 dv={v('email')} k="email" label="البريد الرسمي للجهة" type="email" req ltr />
          <Field0 dv={v('website')} k="website" label="الموقع الإلكتروني" ltr ph="https://" />
        </div>
        <div className={cn('grid gap-5 md:grid-cols-2', step !== 2 && 'hidden')}>
          <p className="rounded-2xl bg-forest-50 p-4 text-sm leading-7 text-forest-900 md:col-span-2">الممثل المفوض هو من يتعامل مع المنصة باسم الجهة، ويلزم إرفاق خطاب تفويضه في قسم المستندات. تُستخدم بياناته للتواصل الرسمي والتوثيق.</p>
          <Field0 dv={v('repName')} k="repName" label="اسم الممثل المفوض" req />
          <Field0 dv={v('repTitle')} k="repTitle" label="صفته في الجهة" req ph="رئيس مجلس الإدارة / المدير التنفيذي" />
          <Field0 dv={v('repPhone')} k="repPhone" label="جوال الممثل" req ltr ph="05xxxxxxxx" />
          <Field0 dv={v('repEmail')} k="repEmail" label="بريد الممثل" type="email" req ltr />
          <Field0 dv={v('contactName')} k="contactName" label="مسؤول التواصل اليومي (إن اختلف)" />
          <Field0 dv={v('contactTitle')} k="contactTitle" label="مسماه الوظيفي" />
        </div>
        <div className={cn('space-y-6', step !== 3 && 'hidden')}>
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
        {step < last ? <Button type="button" onClick={() => setStep(step + 1)}>التالي <ArrowLeft className="size-4" /></Button> : (
          <div className="flex flex-wrap justify-end gap-2">
            <Submit variant="outline">{orgId ? 'حفظ البيانات' : 'حفظ ومتابعة لرفع المستندات'}</Submit>
            {orgId && complete && <Submit name="then" value="request" variant="lime" size="lg">حفظ وطلب التقييم <ArrowLeft className="size-5" /></Submit>}
          </div>
        )}
      </div>
    </form>
  );
}
