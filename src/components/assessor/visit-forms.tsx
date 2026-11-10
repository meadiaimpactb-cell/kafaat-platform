'use client';
import { saveVisitWork, completeVisit, startVisit, saveFollowup } from '@/app/actions/assessor';
import { Submit, FormMessage, PendingCtx, useFormAction } from '@/components/client/submit';

const ITEMS = [['sample', 'تتبع عينة المستفيدين من السجل إلى النتيجة'], ['interviews', 'مقابلات فريق البرامج والقياس'], ['beneficiaries', 'مقابلات مع عينة من المستفيدين'], ['system', 'مراجعة نظام البيانات والصلاحيات ومسار التدقيق'], ['records', 'مطابقة السجلات الأصلية مع الملفات المرفوعة'], ['minutes', 'الاطلاع على محاضر قرارات الأثر']] as const;

export function VisitWorkForm({ visit, sampleSize }: { visit: { id: string; status: string; checklist: Record<string, boolean>; sample: { checked: number; matched: number; notes?: string } | null; notes: string }; sampleSize: number }) {
  const [state, onSave, p1] = useFormAction(saveVisitWork);
  const [cState, onDone, p2] = useFormAction(completeVisit);
  const locked = visit.status === 'COMPLETED' || visit.status === 'CANCELLED';
  const [sState, onStart, p3] = useFormAction(startVisit);
  return (
    <div className="space-y-6">
      {visit.status === 'SCHEDULED' && (
        <PendingCtx.Provider value={p3}><form onSubmit={onStart} className="flex flex-wrap items-center gap-3 rounded-2xl bg-lime-100/60 p-4">
          <input type="hidden" name="visitId" value={visit.id} />
          <span className="flex-1 text-sm">عند وصولك إلى مقر الجهة اضغط «بدء الزيارة» لتسجيل البداية في سجل الزيارة.</span>
          <Submit variant="lime" pendingText="…">بدء الزيارة</Submit><FormMessage state={sState} />
        </form></PendingCtx.Provider>
      )}
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
          <p className="text-sm text-muted">بعد الحفظ وتعديل مستويات المعايير وفق ما ثبت ميدانياً، أنهِ الزيارة، ثم اكتب التقرير التعقيبي وانشره للجهة ليعتمد مدير الحساب الشهادة الموثقة.</p>
          <Submit variant="lime" size="lg" className="w-full" pendingText="…">إنهاء الزيارة</Submit>
          <FormMessage state={cState} />
        </form></PendingCtx.Provider>
      ) : <div className="rounded-2xl bg-forest-100 p-4 text-sm font-semibold text-forest-800">الزيارة منجزة. يعتمد مدير الحساب الشهادة الموثقة بعد مراجعة المستويات.</div>}
    </div>
  );
}

/** التقرير التعقيبي: مسودة ثم نشر للجهة بعد إنهاء الزيارة */
export function FollowupForm({ visit }: { visit: { id: string; status: string; followupStatus: string; followup: { summary: string; strengths: string[]; findings: string[]; recommendations: string[] } | null } }) {
  const [state, onSave, p] = useFormAction(saveFollowup);
  const published = visit.followupStatus === 'PUBLISHED';
  const f = visit.followup;
  const j = (l?: string[]) => (l ?? []).join('\n');
  return (
    <PendingCtx.Provider value={p}><form onSubmit={onSave} className="space-y-4">
      <input type="hidden" name="visitId" value={visit.id} />
      <fieldset disabled={published} className="space-y-4">
        <label className="block"><span className="label">الملخص</span><textarea name="summary" rows={5} defaultValue={f?.summary ?? ''} className="input py-3 leading-7" placeholder="خلاصة ما ثبت ميدانياً ومدى مطابقته للأدلة المرفوعة…" /></label>
        <label className="block"><span className="label">نقاط القوة (سطر لكل نقطة)</span><textarea name="strengths" rows={3} defaultValue={j(f?.strengths)} className="input py-3 leading-7" /></label>
        <label className="block"><span className="label">الملاحظات (سطر لكل ملاحظة)</span><textarea name="findings" rows={3} defaultValue={j(f?.findings)} className="input py-3 leading-7" /></label>
        <label className="block"><span className="label">التوصيات (سطر لكل توصية)</span><textarea name="recommendations" rows={4} defaultValue={j(f?.recommendations)} className="input py-3 leading-7" /></label>
      </fieldset>
      {published ? <div className="rounded-2xl bg-forest-100 p-4 text-sm font-semibold text-forest-800">نُشر التقرير للجهة ولا يمكن تعديله.</div> : (
        <div className="flex flex-wrap items-center gap-3">
          <Submit variant="outline">حفظ كمسودة</Submit>
          <Submit name="publish" value="1" variant="lime" disabled={visit.status !== 'COMPLETED'} title={visit.status !== 'COMPLETED' ? 'يُنشر بعد إنهاء الزيارة' : undefined}>نشر للجهة</Submit>
          <FormMessage state={state} />
        </div>
      )}
    </form></PendingCtx.Provider>
  );
}
