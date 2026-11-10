import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { CalendarDays, FileText, Flag, MapPin, Phone, Printer } from 'lucide-react';
import { db, visits, assessments, organizations, organizationMembers, factorReviews, factors, users, visitEvents } from '@/db';
import { requireUser, can } from '@/lib/auth';
import { getSetting } from '@/lib/settings';
import { PageHeader, Card, CardTitle, ButtonLink, LevelChip, Badge } from '@/components/ui';
import { VisitWorkForm, FollowupForm } from '@/components/assessor/visit-forms';
import { fmtDate, fmtRel } from '@/lib/format';
import { VISIT_STATUS_LABEL, VISIT_EVENT_LABEL, FOLLOWUP_LABEL } from '@/lib/domain';

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
  const contact = (await db.select({ name: users.name, phone: users.phone, email: users.email }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(eq(organizationMembers.orgId, org.id)).limit(1))[0];
  const events = await db.select({ e: visitEvents, who: users.name }).from(visitEvents).leftJoin(users, eq(users.id, visitEvents.actorId)).where(eq(visitEvents.visitId, v.id)).orderBy(desc(visitEvents.createdAt)).limit(15);
  const fl = FOLLOWUP_LABEL[v.followupStatus];
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
            {v.siteContactName && <div className="flex items-center gap-2"><Phone className="size-4 text-forest-700" /> <span><span className="text-muted">من يستقبلك: </span>{v.siteContactName} · <span className="ltr">{v.siteContactPhone}</span></span></div>}
            {contact && <div className="flex items-center gap-2"><Phone className="size-4 text-forest-700" /> <span><span className="text-muted">ممثل الجهة: </span>{contact.name} · <span className="ltr">{contact.phone ?? contact.email}</span></span></div>}
            <div className="text-xs text-muted">{v.orgConfirmedAt ? 'أكدت الجهة الموعد' : 'لم تؤكد الجهة الموعد بعد'}</div>
          </Card>
          <Card className="p-6">
            <CardTitle title="معايير علّمها المقيّم للتحقق" subtitle={`${flagged.length} معياراً · حجم العينة المقترح ${general.visitSampleSize} حالة`} icon={<Flag className="size-5" />} />
            <ul className="mt-4 space-y-2">{flagged.map(({ r, name }) => <li key={r.id}><Link href={`/assessor/assessments/${a.id}?f=${r.factorId}`} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm hover:border-forest-500"><LevelChip level={r.level} size="sm" /><span className="flex-1">{name}</span><span className="ltr text-xs text-muted">{r.factorId}</span></Link></li>)}{!flagged.length && <li className="text-sm text-muted">لم يعلّم المقيّم معايير بعينها؛ ركّز على معايير الموارد والقياس.</li>}</ul>
          </Card>
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <CardTitle title="سجل العمل الميداني" />
            <div className="mt-5"><VisitWorkForm visit={{ id: v.id, status: v.status, checklist: v.checklist ?? {}, sample: v.sampleResult ?? null, notes: v.notes ?? '' }} sampleSize={general.visitSampleSize} /></div>
          </Card>
          {['IN_PROGRESS', 'COMPLETED'].includes(v.status) && (
            <Card className="p-6">
              <CardTitle title="التقرير التعقيبي" subtitle="تقرير رسمي للجهة بنتيجة الزيارة. يُنشر بعد إنهاء الزيارة." icon={<FileText className="size-5" />}
                action={<span className="flex items-center gap-2"><Badge tone={fl.tone}>{fl.label}</Badge>{v.followup && <ButtonLink href={`/print/followup/${v.id}`} variant="outline" size="sm"><Printer className="size-4" /> معاينة</ButtonLink>}</span>} />
              <div className="mt-5"><FollowupForm visit={{ id: v.id, status: v.status, followupStatus: v.followupStatus, followup: v.followup ?? null }} /></div>
            </Card>
          )}
          {events.length > 0 && (
            <Card className="p-6">
              <CardTitle title="سجل الزيارة" />
              <ol className="relative mt-5 space-y-4 border-s-2 border-forest-100 ps-5">
                {events.map(({ e, who }) => (
                  <li key={e.id} className="relative"><span className="absolute -start-[27px] top-1 size-3 rounded-full bg-forest-600 ring-4 ring-white" />
                    <div className="text-sm font-semibold">{VISIT_EVENT_LABEL[e.type] ?? e.type}{who ? <span className="font-normal text-muted"> · {who}</span> : null}</div>
                    {e.note && <div className="text-sm text-muted">{e.note}</div>}
                    <div className="text-xs text-muted">{fmtRel(e.createdAt)}</div></li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
