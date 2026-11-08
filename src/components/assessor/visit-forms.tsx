'use client';
import { saveVisitWork, completeVisit } from '@/app/actions/assessor';
import { Submit, FormMessage, PendingCtx, useFormAction } from '@/components/client/submit';

const ITEMS = [['sample', 'تتبع عينة المستفيدين من السجل إلى النتيجة'], ['interviews', 'مقابلات فريق البرامج والقياس'], ['beneficiaries', 'مقابلات مع عينة من المستفيدين'], ['system', 'مراجعة نظام البيانات والصلاحيات ومسار التدقيق'], ['records', 'مطابقة السجلات الأصلية مع الملفات المرفوعة'], ['minutes', 'الاطلاع على محاضر قرارات الأثر']] as const;

export function VisitWorkForm({ visit, sampleSize }: { visit: { id: string; status: string; checklist: Record<string, boolean>; sample: { checked: number; matched: number; notes?: string } | null; notes: string }; sampleSize: number }) {
  const [state, onSave, p1] = useFormAction(saveVisitWork);
  const [cState, onDone, p2] = useFormAction(completeVisit);
  const locked = visit.status === 'COMPLETED' || visit.status === 'CANCELLED';
  return (
    <div className="space-y-6">
      <PendingCtx.Provider value={p1}><form onSubmit={onSave} className="space-y-5">
        <input type="hidden" name="visitId" value={visit.id} />
        <fieldset disabled={locked} className="space-y-2">
          {ITEMS.map(([k, t]) => <label key={k} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-forest-600 has-[:checked]:bg-forest-50"><input type="checkbox" name={'c_' + k} defaultChecked={!!visit.checklist[k]} className="size-5 accent-forest-700" />{t}</label>)}
        </fieldset>
        <fieldset disabled={locked} className="grid gap-4 rounded-2xl bg-forest-50 p-4 sm:grid-cols-2">
          <label><span className="label">حالات مفحوصة</span><input name="checked" type="number" min={0} defaultValue={visit.sample?.checked ?? sampleSize} className="input num" /></label>
          <label><span className="label">حالات مطابقة</span><input name="matched" type="number" min={0} defaultValue={visit.sample?.matched ?? ''} className="input num" /></label>
          <label className="sm:col-span-2"><span className="label">ملاحظات العينة</span><input name="sampleNotes" defaultValue={visit.sample?.notes ?? ''} className="input" placeholder="مثال: حالتان دون توثيق المتابعة بعد 6 أشهر" /></label>
        </fieldset>
        <label className="block"><span className="label">ملاحظات الزيارة</span><textarea name="notes" disabled={locked} defaultValue={visit.notes} rows={4} className="input py-3 leading-7" /></label>
        {!locked && <div className="flex items-center gap-3"><Submit variant="outline">حفظ</Submit><FormMessage state={state} /></div>}
      </form></PendingCtx.Provider>
      {!locked ? (
        <PendingCtx.Provider value={p2}><form onSubmit={onDone} className="space-y-2 border-t border-line pt-5">
          <input type="hidden" name="visitId" value={visit.id} />
          <p className="text-sm text-muted">بعد الحفظ وتعديل مستويات العوامل وفق ما ثبت ميدانياً، أنهِ الزيارة ليعتمد مدير الحساب الشهادة الموثقة.</p>
          <Submit variant="lime" size="lg" className="w-full" pendingText="…">إنهاء الزيارة</Submit>
          <FormMessage state={cState} />
        </form></PendingCtx.Provider>
      ) : <div className="rounded-2xl bg-forest-100 p-4 text-sm font-semibold text-forest-800">الزيارة منجزة. يعتمد مدير الحساب الشهادة الموثقة بعد مراجعة المستويات.</div>}
    </div>
  );
}
