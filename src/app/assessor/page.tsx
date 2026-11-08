import Link from 'next/link';
import { desc, eq, or, and, inArray } from 'drizzle-orm';
import { CalendarClock, ClipboardCheck, ClipboardList, MessageSquareWarning, Timer } from 'lucide-react';
import { db, assessments, organizations, visits } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Stat, Card, CardTitle, Progress, Empty, LevelBadge } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { fmtDate, fmtRel } from '@/lib/format';
import { TRACK_LABEL } from '@/lib/domain';

export const metadata = { title: 'لوحة المقيّم' };
export default async function Page() {
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const rows = await db.select({ a: assessments, org: organizations.name, city: organizations.city }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId))
    .where(or(eq(assessments.assessorId, u.id), eq(assessments.secondAssessorId, u.id))).orderBy(desc(assessments.submittedAt));
  const vs = await db.select({ v: visits, a: assessments, org: organizations.name }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(and(eq(visits.consultantId, u.id), inArray(visits.status, ['PAID', 'SCHEDULED'])));
  const active = rows.filter(r => ['SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED'].includes(r.a.status));
  const done = rows.filter(r => ['DESK_COMPLETED', 'VERIFICATION', 'CERTIFIED'].includes(r.a.status));
  const days = (d: Date | null) => (d ? Math.max(0, Math.round((Date.now() - +d) / 864e5)) : 0);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`مرحباً ${u.name}`} title="لوحة المقيّم" subtitle="الطلبات المسندة إليك مرتبة بالأقدم انتظاراً. افتح الطلب لتقييم كل عامل في نافذته." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="بانتظار المراجعة" value={active.filter(r => r.a.status !== 'INFO_REQUESTED').length} icon={<ClipboardList className="size-5" />} />
        <Stat label="بانتظار رد الجهة" value={active.filter(r => r.a.status === 'INFO_REQUESTED').length} icon={<MessageSquareWarning className="size-5" />} tone="orange" />
        <Stat label="زيارات قادمة" value={vs.length} icon={<CalendarClock className="size-5" />} tone="lime" />
        <Stat label="تقييمات منجزة" value={done.length} icon={<ClipboardCheck className="size-5" />} tone="amber" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <CardTitle title="قائمة العمل" subtitle="الأولوية للأقدم" />
          <div className="mt-4 space-y-3">
            {active.sort((x, y) => +(x.a.submittedAt ?? 0) - +(y.a.submittedAt ?? 0)).map(({ a, org, city }) => (
              <Link key={a.id} href={`/assessor/assessments/${a.id}`} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-forest-500 hover:shadow-sm">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{org}</span><StatusBadge status={a.status} /></div><div className="mt-0.5 text-xs text-muted"><span className="ltr">{a.number}</span> · {city} · المسار {a.track ? TRACK_LABEL[a.track] : '—'} · السنة {a.cycleYear}</div></div>
                <div className="w-32"><div className="mb-1 text-[11px] text-muted">اكتمال الملف {a.progress}٪</div><Progress value={a.progress} /></div>
                <div className={`flex items-center gap-1 text-xs font-semibold ${days(a.submittedAt) > 5 ? 'text-orange-brand' : 'text-muted'}`}><Timer className="size-4" /> {days(a.submittedAt)} يوم</div>
              </Link>
            ))}
            {!active.length && <Empty title="لا طلبات بانتظارك" text="ستصلك رسالة عند إسناد طلب جديد." />}
          </div>
        </Card>
        <div className="space-y-6">
          <Card className="p-6">
            <CardTitle title="زيارات التحقق" />
            <div className="mt-4 space-y-3">{vs.map(({ v, org }) => <Link key={v.id} href={`/assessor/visits/${v.id}`} className="block rounded-2xl bg-forest-50 p-4 hover:bg-forest-100"><div className="font-semibold">{org}</div><div className="text-xs text-muted">{v.scheduledAt ? fmtDate(v.scheduledAt, true) : 'بانتظار تحديد الموعد'} · {v.location ?? ''}</div></Link>)}{!vs.length && <div className="text-sm text-muted">لا زيارات مجدولة.</div>}</div>
          </Card>
          <Card className="p-6">
            <CardTitle title="آخر ما أنجزت" />
            <div className="mt-4 space-y-2">{done.slice(0, 6).map(({ a, org }) => <Link key={a.id} href={`/assessor/assessments/${a.id}`} className="flex items-center justify-between gap-2 rounded-xl p-2 hover:bg-forest-50"><div className="min-w-0"><div className="truncate text-sm font-semibold">{org}</div><div className="text-xs text-muted">{fmtRel(a.deskCompletedAt)}</div></div><div className="flex items-center gap-2"><span className="num font-bold">{a.deskScore}</span><LevelBadge level={a.deskLevel} /></div></Link>)}{!done.length && <div className="text-sm text-muted">—</div>}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
