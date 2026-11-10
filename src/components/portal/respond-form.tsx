'use client';
import { respondInfoRequest, requestVisit, confirmVisit, proposeVisitDates } from '@/app/actions/org';
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

export function VisitForm({ assessmentId, defaults }: { assessmentId: string; defaults?: { preferredDates?: string | null; location?: string | null; siteContactName?: string | null; siteContactPhone?: string | null } }) {
  const [state, onSubmit, pending] = useFormAction(requestVisit);
  return (
    <PendingCtx.Provider value={pending}><form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <label className="block"><span className="label">الأيام المفضلة للزيارة</span><input name="preferredDates" defaultValue={defaults?.preferredDates ?? ''} className="input" placeholder="مثال: الأحد أو الثلاثاء صباحاً خلال الأسبوعين القادمين" /></label>
      <label className="block"><span className="label">مقر الزيارة</span><input name="location" defaultValue={defaults?.location ?? ''} className="input" placeholder="المقر الرئيس — الحي، المدينة" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">من يستقبل الخبير في الجهة</span><input name="siteContactName" defaultValue={defaults?.siteContactName ?? ''} className="input" /></label>
        <label className="block"><span className="label">جواله</span><input name="siteContactPhone" defaultValue={defaults?.siteContactPhone ?? ''} className="input ltr" placeholder="05xxxxxxxx" /></label>
      </div>
      <Submit variant="lime" size="lg" className="w-full" pendingText="جارٍ الانتقال للدفع…">متابعة إلى دفع رسوم التوثيق</Submit>
      <FormMessage state={state} />
    </form></PendingCtx.Provider>
  );
}

/** تأكيد الموعد المجدول من الجهة */
export function ConfirmVisitForm({ assessmentId }: { assessmentId: string }) {
  const [state, onSubmit, pending] = useFormAction(confirmVisit);
  return (
    <PendingCtx.Provider value={pending}><form onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <Submit variant="lime" className="w-full" pendingText="جارٍ التأكيد…">أؤكد الموعد</Submit>
      <FormMessage state={state} />
    </form></PendingCtx.Provider>
  );
}
/** اقتراح مواعيد بديلة وبيانات من يستقبل الخبير */
export function ProposeVisitForm({ assessmentId, defaults }: { assessmentId: string; defaults?: { preferredDates?: string | null; siteContactName?: string | null; siteContactPhone?: string | null } }) {
  const [state, onSubmit, pending] = useFormAction(proposeVisitDates);
  return (
    <PendingCtx.Provider value={pending}><form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <label className="block"><span className="label">مواعيد مقترحة بديلة</span><input name="preferredDates" defaultValue={defaults?.preferredDates ?? ''} className="input" placeholder="مثال: الاثنين أو الأربعاء بعد العاشرة صباحاً" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="label">من يستقبل الخبير</span><input name="siteContactName" defaultValue={defaults?.siteContactName ?? ''} className="input" /></label>
        <label className="block"><span className="label">جواله</span><input name="siteContactPhone" defaultValue={defaults?.siteContactPhone ?? ''} className="input ltr" /></label>
      </div>
      <Submit variant="outline" pendingText="جارٍ الإرسال…">إرسال للفريق</Submit>
      <FormMessage state={state} />
    </form></PendingCtx.Provider>
  );
}
