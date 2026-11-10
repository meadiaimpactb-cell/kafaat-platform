import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { CalendarClock, MapPin, Phone, UserCheck } from 'lucide-react';
import { db, visitEvents, users } from '@/db';
import { Badge } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { scheduleVisit, unscheduleVisit, cancelVisit } from '@/app/actions/admin';
import { VISIT_STATUS_LABEL, VISIT_EVENT_LABEL, FOLLOWUP_LABEL } from '@/lib/domain';
import { fmtDate, fmtRel } from '@/lib/format';
import type { visits } from '@/db';

type Visit = typeof visits.$inferSelect;
export type Consultant = { id: string; name: string; load?: number };
const toLocal = (d: Date | null) => (d ? new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 16) : '');

/** بطاقة إدارة زيارة التحقق: الحالة، الخط الزمني، الجدولة وإعادة الجدولة، الإلغاء */
export async function VisitPanel({ v, consultants, canManage, number, org, compact }: { v: Visit; consultants: Consultant[]; canManage: boolean; number?: string; org?: { id: string; name: string; city?: string | null; assessmentId: string }; compact?: boolean }) {
  const s = VISIT_STATUS_LABEL[v.status]; const f = FOLLOWUP_LABEL[v.followupStatus];
  const events = await db.select({ e: visitEvents, who: users.name }).from(visitEvents).leftJoin(users, eq(users.id, visitEvents.actorId)).where(eq(visitEvents.visitId, v.id)).orderBy(desc(visitEvents.createdAt)).limit(compact ? 4 : 12);
  const consultant = consultants.find(c => c.id === v.consultantId);
  const open = !['COMPLETED', 'CANCELLED'].includes(v.status);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          {org && <Link href={`/admin/assessments/${org.assessmentId}`} className="font-semibold text-forest-800 hover:underline">{org.name}</Link>}
          <div className="text-xs text-muted">{number && <span className="ltr">{number}</span>}{org?.city ? ` · ${org.city}` : ''}</div>
        </div>
        <Badge tone={s.tone} dot>{s.label}</Badge>
        <Badge tone={f.tone}>التقرير التعقيبي: {f.label}</Badge>
        {v.status === 'SCHEDULED' && <Badge tone={v.orgConfirmedAt ? 'green' : 'amber'}>{v.orgConfirmedAt ? 'الجهة أكدت الموعد' : 'بانتظار تأكيد الجهة'}</Badge>}
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-start gap-2"><CalendarClock className="mt-0.5 size-4 shrink-0 text-forest-700" /><div><div className="text-xs text-muted">الموعد</div>{v.scheduledAt ? fmtDate(v.scheduledAt, true) : <span className="text-muted">لم يُحدد · المفضل: {v.preferredDates ?? '—'}</span>}{v.rescheduleCount > 0 && <span className="ms-1 text-xs text-orange-brand">(أُعيدت جدولتها {v.rescheduleCount}×)</span>}</div></div>
        <div className="flex items-start gap-2"><UserCheck className="mt-0.5 size-4 shrink-0 text-forest-700" /><div><div className="text-xs text-muted">خبير التحقق</div>{consultant?.name ?? <span className="font-semibold text-orange-brand">غير مسند</span>}</div></div>
        <div className="flex items-start gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-forest-700" /><div><div className="text-xs text-muted">المقر</div>{v.location ?? '—'}</div></div>
        <div className="flex items-start gap-2"><Phone className="mt-0.5 size-4 shrink-0 text-forest-700" /><div><div className="text-xs text-muted">من يستقبل الخبير</div>{v.siteContactName ? <>{v.siteContactName} <span className="ltr text-xs text-muted">{v.siteContactPhone}</span></> : '—'}</div></div>
      </div>
      {v.sampleResult && <div className="text-sm"><span className="text-muted">عينة التتبع: </span><b className="num">{v.sampleResult.matched}/{v.sampleResult.checked}</b> مطابقة</div>}
      {canManage && ['PAID', 'SCHEDULED'].includes(v.status) && (
        <ActionForm action={scheduleVisit} className="grid gap-3 rounded-2xl bg-forest-50 p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <input type="hidden" name="visitId" value={v.id} />
          <label><span className="label">خبير التحقق الميداني</span><select name="consultantId" defaultValue={v.consultantId ?? ''} className="input"><option value="">اختر</option>{consultants.map(c => <option key={c.id} value={c.id}>{c.name}{c.load != null ? ` — ${c.load} زيارة نشطة` : ''}</option>)}</select></label>
          <label><span className="label">الموعد (بتوقيت الرياض)</span><input type="datetime-local" name="scheduledAt" defaultValue={toLocal(v.scheduledAt)} className="input ltr" /></label>
          <label><span className="label">المقر</span><input name="location" defaultValue={v.location ?? ''} className="input" /></label>
          <label><span className="label">من يستقبل الخبير</span><input name="siteContactName" defaultValue={v.siteContactName ?? ''} className="input" /></label>
          <label><span className="label">جواله</span><input name="siteContactPhone" defaultValue={v.siteContactPhone ?? ''} className="input ltr" /></label>
          <label className="sm:col-span-2"><span className="label">ملاحظة للجهة (اختياري)</span><input name="note" className="input" /></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="force" /> تجاوز تعارض مواعيد الخبير</label>
          <div className="lg:col-start-4"><Submit>{v.status === 'SCHEDULED' ? 'تحديث / إعادة جدولة' : 'جدولة الزيارة'}</Submit></div>
        </ActionForm>
      )}
      {canManage && open && (
        <div className="flex flex-wrap gap-3">
          {v.status === 'SCHEDULED' && <ActionForm action={unscheduleVisit} className="flex items-center gap-2"><input type="hidden" name="visitId" value={v.id} /><input name="reason" className="input h-9 w-48" placeholder="سبب إعادتها للجدولة" /><Submit variant="outline" size="sm">إعادة للجدولة</Submit></ActionForm>}
          <ActionForm action={cancelVisit} className="flex items-center gap-2"><input type="hidden" name="visitId" value={v.id} /><input name="reason" className="input h-9 w-48" placeholder="سبب الإلغاء" /><Submit variant="outline" size="sm" className="text-rose-700">إلغاء الزيارة</Submit></ActionForm>
        </div>
      )}
      {events.length > 0 && (
        <ol className="space-y-2 border-t border-line pt-3 text-sm">
          {events.map(({ e, who }) => <li key={e.id} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-forest-500" /><span className="flex-1"><b>{VISIT_EVENT_LABEL[e.type] ?? e.type}</b>{who ? ` · ${who}` : e.actorRole === 'ORG_USER' ? ' · الجهة' : ''}{e.note ? <span className="text-muted"> — {e.note}</span> : null}</span><span className="text-xs text-muted">{fmtRel(e.createdAt)}</span></li>)}
        </ol>
      )}
    </div>
  );
}
