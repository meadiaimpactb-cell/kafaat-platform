import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { ClipboardList } from 'lucide-react';
import { db, assessments } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card, Progress, Empty, Button } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { createAssessmentRequest } from '@/app/actions/org';
import { fmtDate, fmtNum } from '@/lib/format';
import { TRACK_LABEL } from '@/lib/domain';

export const metadata = { title: 'طلبات التقييم' };
export default async function Page() {
  const u = await requireUser(['ORG_USER']);
  const rows = await db.select().from(assessments).where(eq(assessments.orgId, u.orgId!)).orderBy(desc(assessments.createdAt));
  return (
    <div>
      <PageHeader title="طلبات التقييم" subtitle="كل طلب يغطي سنة مالية واحدة، والشهادة تسري حتى نهاية السنة التالية لها." actions={<form action={createAssessmentRequest}><Button>طلب تقييم جديد</Button></form>} />
      {rows.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map(a => {
            const res = (a.finalResult ?? a.deskResult) as { total: number; level: string } | null;
            return (
              <Link key={a.id} href={`/portal/assessments/${a.id}`} className="card group block p-6 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="text-xs text-muted ltr text-right">{a.number}</div><div className="mt-1 font-display text-lg font-semibold">تقييم السنة المالية {a.cycleYear}</div><div className="text-sm text-muted">المسار {a.track ? TRACK_LABEL[a.track] : '—'} · أُنشئ {fmtDate(a.createdAt)}</div></div>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-5 flex items-center gap-4">
                  {res ? <div className="font-display text-3xl font-bold num text-forest-800">{fmtNum(res.total, 1)}<span className="ms-2 text-base text-muted">{res.level}</span></div> : <><Progress value={a.progress} /><span className="text-sm font-semibold num">{a.progress}٪</span></>}
                </div>
              </Link>
            );
          })}
        </div>
      ) : <Empty icon={<ClipboardList className="size-6" />} title="لا توجد طلبات بعد" text="ابدأ بطلب تقييم السنة المالية الماضية." action={<form action={createAssessmentRequest}><Button>اطلب التقييم</Button></form>} />}
    </div>
  );
}
