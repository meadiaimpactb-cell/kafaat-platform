import type { ReactNode } from 'react';
import { and, count, eq } from 'drizzle-orm';
import { CalendarCheck2, Hourglass } from 'lucide-react';
import { db, infoRequests } from '@/db';
import { loadOwn } from '@/lib/portal';
import { Ring } from '@/components/ui';
import { JourneyTrack, StatusBadge } from '@/components/journey';
import { Tabs } from '@/components/client/tabs';
import { STATUS, TRACK_LABEL } from '@/lib/domain';
import { validUntilFor } from '@/lib/workflow';
import { fmtDate } from '@/lib/format';

export default async function Layout({ children, params }: { children: ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { a, hasResult } = await loadOwn(id);
  const open = (await db.select({ c: count() }).from(infoRequests).where(and(eq(infoRequests.assessmentId, id), eq(infoRequests.status, 'OPEN'))))[0].c;
  const paid = !['DRAFT', 'AWAITING_PAYMENT', 'CANCELLED'].includes(a.status);
  const base = `/portal/assessments/${id}`;
  const st = STATUS[a.status];
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] bg-forest-950 p-6 text-white md:p-8">
        <div className="bg-grid-dark absolute inset-0 opacity-60" />
        <div className="absolute -left-24 -top-24 size-72 rounded-full bg-lime-brand/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3"><span className="ltr rounded-lg bg-white/10 px-2.5 py-1 font-mono text-xs">{a.number}</span><StatusBadge status={a.status} /></div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">تقييم كفاءة الأثر · السنة المالية {a.cycleYear}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/65">
              <span>المسار {a.track ? TRACK_LABEL[a.track] : '—'}</span>
              <span className="flex items-center gap-1.5"><CalendarCheck2 className="size-4" /> الشهادة سارية حتى {fmtDate(validUntilFor(a.cycleYear))}</span>
              {st.hint && <span className="flex items-center gap-1.5 text-lime-brand"><Hourglass className="size-4" />{st.hint}</span>}
            </div>
          </div>
          <Ring value={a.progress} size={104} stroke={10} color="#C4D42A" label={<span className="font-display text-2xl font-bold text-white num">{a.progress}٪</span>} sub={<span className="text-[11px] text-white/55">اكتمال الملف</span>} />
        </div>
      </div>
      <JourneyTrack status={a.status} />
      <Tabs items={[
        { href: base, label: 'نظرة عامة', exact: true },
        { href: `${base}/questions`, label: 'الأسئلة', disabled: !paid },
        { href: `${base}/documents`, label: 'الملفات والأدلة', disabled: !paid },
        { href: `${base}/requests`, label: 'الاستيضاحات', count: open, tone: 'orange', disabled: !paid },
        { href: `${base}/result`, label: 'النتيجة', disabled: !hasResult },
        { href: `${base}/verification`, label: 'التوثيق', disabled: !hasResult },
        { href: `/portal/messages/${id}`, label: 'المراسلة', disabled: !paid },
      ]} />
      <div>{children}</div>
    </div>
  );
}
