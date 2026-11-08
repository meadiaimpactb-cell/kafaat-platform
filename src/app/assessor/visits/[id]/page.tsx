import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { CalendarDays, Flag, MapPin, Phone } from 'lucide-react';
import { db, visits, assessments, organizations, factorReviews, factors, users } from '@/db';
import { requireUser, can } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { PageHeader, Card, CardTitle, ButtonLink, LevelChip, Badge } from '@/components/ui';
import { VisitWorkForm } from '@/components/assessor/visit-forms';
import { fmtDate } from '@/lib/format';
import { VISIT_STATUS_LABEL } from '@/lib/domain';

export const metadata = { title: 'ملف الزيارة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const v = (await db.select().from(visits).where(eq(visits.id, id)).limit(1))[0];
  if (!v) notFound();
  const staff = u.role === 'SUPER_ADMIN' || can(u, 'visits.manage');
  if (!staff && v.consultantId !== u.id) notFound();
  const a = (await db.select().from(assessments).where(eq(assessments.id, v.assessmentId)).limit(1))[0];
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const contact = (await db.select().from(users).where(eq(users.orgId, org.id)).limit(1))[0];
  const flagged = await db.select({ r: factorReviews, name: factors.name }).from(factorReviews).innerJoin(factors, eq(factors.id, factorReviews.factorId)).where(and(eq(factorReviews.assessmentId, a.id), eq(factorReviews.phase, 'DESK'), eq(factorReviews.needsVerification, true)));
  const general = await getSetting('general');
  const s = VISIT_STATUS_LABEL[v.status];
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<span className="ltr">{a.number}</span>} title={`زيارة تحقق: ${org.name}`} subtitle={`الدرجة المكتبية ${a.deskScore} · «${a.deskLevel}»`} actions={<><Badge tone={s.tone} dot>{s.label}</Badge><ButtonLink href={`/assessor/assessments/${a.id}`} variant="outline">تعديل المستويات بعد التحقق</ButtonLink></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <Card className="space-y-3 p-6 text-sm">
            <div className="flex items-center gap-2"><CalendarDays className="size-4 text-forest-700" /> {v.scheduledAt ? fmtDate(v.scheduledAt, true) : `لم يُحدد · المفضل: ${v.preferredDates ?? '—'}`}</div>
            <div className="flex items-center gap-2"><MapPin className="size-4 text-forest-700" /> {v.location ?? org.address ?? org.city}</div>
            {contact && <div className="flex items-center gap-2"><Phone className="size-4 text-forest-700" /> {contact.name} · <span className="ltr">{contact.phone ?? contact.email}</span></div>}
          </Card>
          <Card className="p-6">
            <CardTitle title="عوامل علّمها المقيّم للتحقق" subtitle={`${flagged.length} عاملاً · حجم العينة المقترح ${general.visitSampleSize} حالة`} icon={<Flag className="size-5" />} />
            <ul className="mt-4 space-y-2">{flagged.map(({ r, name }) => <li key={r.id}><Link href={`/assessor/assessments/${a.id}?f=${r.factorId}`} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm hover:border-forest-500"><LevelChip level={r.level} size="sm" /><span className="flex-1">{name}</span><span className="ltr text-xs text-muted">{r.factorId}</span></Link></li>)}{!flagged.length && <li className="text-sm text-muted">لم يعلّم المقيّم عوامل بعينها؛ ركّز على عوامل المحورين 2 و3.</li>}</ul>
          </Card>
        </div>
        <Card className="p-6">
          <CardTitle title="سجل العمل الميداني" />
          <div className="mt-5"><VisitWorkForm visit={{ id: v.id, status: v.status, checklist: v.checklist ?? {}, sample: v.sampleResult ?? null, notes: v.notes ?? '' }} sampleSize={general.visitSampleSize} /></div>
        </Card>
      </div>
    </div>
  );
}
