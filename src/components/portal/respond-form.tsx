'use client';
import { respondInfoRequest, requestVisit } from '@/app/actions/org';
import { Submit, FormMessage, PendingCtx, useFormAction } from '@/components/client/submit';

export function RespondForm({ id }: { id: string }) {
  const [state, onSubmit, pending] = useFormAction(respondInfoRequest);
  return (
    <PendingCtx.Provider value={pending}><form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <textarea name="response" rows={3} className="input py-3 leading-7" placeholder="اكتب ردك هنا…" />
      <div className="flex items-center gap-3"><Submit pendingText="جارٍ الإرسال…">إرسال الرد</Submit><FormMessage state={state} /></div>
    </form></PendingCtx.Provider>
  );
}

export function VisitForm({ assessmentId, defaults }: { assessmentId: string; defaults?: { preferredDates?: string | null; location?: string | null } }) {
  const [state, onSubmit, pending] = useFormAction(requestVisit);
  return (
    <PendingCtx.Provider value={pending}><form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <label className="block"><span className="label">الأيام المفضلة للزيارة</span><input name="preferredDates" defaultValue={defaults?.preferredDates ?? ''} className="input" placeholder="مثال: الأحد أو الثلاثاء صباحاً خلال الأسبوعين القادمين" /></label>
      <label className="block"><span className="label">مقر الزيارة</span><input name="location" defaultValue={defaults?.location ?? ''} className="input" placeholder="المقر الرئيس — الحي، المدينة" /></label>
      <Submit variant="lime" size="lg" className="w-full" pendingText="جارٍ الانتقال للدفع…">متابعة إلى دفع رسوم الزيارة</Submit>
      <FormMessage state={state} />
    </form></PendingCtx.Provider>
  );
}
