import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { MapPin } from 'lucide-react';
import { db, visits, assessments, organizations, users } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Card, Badge, Empty } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { scheduleVisit } from '@/app/actions/admin';
import { VISIT_STATUS_LABEL } from '@/lib/domain';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'زيارات التحقق' };
export default async function Page() {
  await requireStaff('visits.manage');
  const rows = await db.select({ v: visits, a: assessments, org: organizations.name, city: organizations.city }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).orderBy(desc(visits.updatedAt));
  const cons = await db.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.role, 'ASSESSOR'), eq(users.isFieldVerifier, true), eq(users.active, true)));
  const toLocal = (d: Date | null) => (d ? new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 16) : '');
  return (
    <div>
      <PageHeader title="زيارات التحقق" subtitle="جدولة الزيارات المدفوعة وإسنادها للمستشارين الميدانيين. تُشعر الجهة والمستشار تلقائياً." />
      {rows.length ? <div className="space-y-3">{rows.map(({ v, a, org, city }) => { const s = VISIT_STATUS_LABEL[v.status]; return (
        <Card key={v.id} className="p-5">
          <div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><Link href={`/admin/assessments/${a.id}`} className="font-semibold text-forest-800 hover:underline">{org}</Link><div className="text-xs text-muted"><span className="ltr">{a.number}</span> · {city} · المفضل: {v.preferredDates ?? '—'} · {v.location ?? ''}</div></div><Badge tone={s.tone} dot>{s.label}</Badge>{v.scheduledAt && <span className="text-sm">{fmtDate(v.scheduledAt, true)}</span>}</div>
          {['PAID', 'SCHEDULED'].includes(v.status) && (
            <ActionForm action={scheduleVisit} className="mt-4 grid gap-3 border-t border-line pt-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
              <input type="hidden" name="visitId" value={v.id} />
              <label><span className="label">المستشار</span><select name="consultantId" defaultValue={v.consultantId ?? ''} className="input"><option value="">اختر</option>{cons.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <label><span className="label">الموعد</span><input type="datetime-local" name="scheduledAt" defaultValue={toLocal(v.scheduledAt)} className="input ltr" /></label>
              <label><span className="label">المقر</span><input name="location" defaultValue={v.location ?? ''} className="input" /></label>
              <Submit>{v.status === 'SCHEDULED' ? 'تحديث' : 'جدولة'}</Submit>
            </ActionForm>
          )}
          {v.status === 'COMPLETED' && a.status === 'VERIFICATION' && <div className="mt-3 rounded-xl bg-lime-100/60 p-3 text-sm">اكتملت الزيارة — <Link href={`/admin/assessments/${a.id}`} className="font-semibold text-forest-800 underline">اعتمد الشهادة الموثقة</Link></div>}
        </Card>
      ); })}</div> : <Empty icon={<MapPin className="size-6" />} title="لا زيارات بعد" />}
    </div>
  );
}
