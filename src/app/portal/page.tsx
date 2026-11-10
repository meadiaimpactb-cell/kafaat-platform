import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, desc, eq, ne } from 'drizzle-orm';
import { ArrowLeft, CalendarCheck, CreditCard, FileUp, ListChecks, MessageSquareWarning, Sparkles, Award, Hourglass, ShieldAlert } from 'lucide-react';
import { db, assessments, payments, activityLogs, infoRequests, certificates, visits } from '@/db';
import { requireOrgUser } from '@/lib/auth';
import { JourneyTrack, StatusBadge } from '@/components/journey';
import { Button, ButtonLink, Card, CardTitle, EfficiencyLabel, Ring } from '@/components/ui';
import { ReadinessPanel } from '@/components/portal/readiness-panel';
import { TeamCard } from '@/components/portal/team-card';
import { getSetting } from '@/lib/settings';
import { VERIFICATION_LABEL } from '@/lib/org-meta';
import { createAssessmentRequest } from '@/app/actions/org';
import { recomputeProgress } from '@/lib/workflow';
import { TRACK_LABEL, TRACK_RANGE } from '@/lib/domain';
import { fmtDate, fmtRel, fmtSAR } from '@/lib/format';
import { quote } from '@/lib/payments';

const ACTION_LABEL: Record<string, string> = {
  'assessment.created': 'أُنشئ طلب التقييم', 'payment.paid': 'اكتمل الدفع', 'document.uploaded': 'رُفع ملف', 'assessment.submitted': 'أُرسل الطلب للمراجعة', 'assessment.assigned': 'أُسند الطلب لخبير مراجع', 'assessment.verifier': 'عُيّن خبير التحقق', 'visit.confirmed': 'أُكد موعد الزيارة', 'visit.followup': 'صدر التقرير التعقيبي',
  'review.started': 'بدأت المراجعة', 'info.requested': 'طُلب استيضاح', 'assessment.resubmitted': 'أُعيد الإرسال بعد الاستيضاح', 'desk.completed': 'صدرت النتيجة غير الموثقة', 'visit.requested': 'طُلبت زيارة التحقق',
  'visit.scheduled': 'جُدولت زيارة التحقق', 'visit.completed': 'اكتملت زيارة التحقق', 'certificate.verified': 'صدرت الشهادة الموثقة',
};

export default async function PortalHome({ searchParams }: { searchParams: Promise<{ paid?: string }> }) {
  const u = await requireOrgUser();
  const org = u.org;
  if (!org.profileCompleted) redirect(`/portal/onboarding?org=${org.id}&need=1#docs`);
  const a = (await db.select().from(assessments).where(and(eq(assessments.orgId, org.id), ne(assessments.status, 'CANCELLED'))).orderBy(desc(assessments.createdAt)).limit(1))[0];
  const cycle = new Date().getFullYear() - 1;
  const sp = await searchParams;
  const certQuote = await quote('CERTIFICATE');

  let next: { title: string; text: string; cta?: React.ReactNode; icon: React.ReactNode } = { title: `اطلب تقييم السنة المالية ${cycle}`, text: 'ستتعرف على درجة كفاءة الأثر لجهتك وما ينقصها، بتقييم مهني من خلال خبراء معتمدين.', icon: <Sparkles />, cta: <form action={createAssessmentRequest}><Button variant="lime" size="lg">اطلب التقييم الآن <ArrowLeft className="size-5" /></Button></form> };
  let prog: Awaited<ReturnType<typeof recomputeProgress>> | null = null;
  let openReqs = 0; let pendingPay: typeof payments.$inferSelect | undefined; let cert: typeof certificates.$inferSelect | undefined; let visit: typeof visits.$inferSelect | undefined;
  if (a) {
    prog = await recomputeProgress(a.id);
    openReqs = (await db.select().from(infoRequests).where(and(eq(infoRequests.assessmentId, a.id), eq(infoRequests.status, 'OPEN')))).length;
    pendingPay = (await db.select().from(payments).where(eq(payments.assessmentId, a.id))).find(p => ['PENDING', 'FAILED', 'AWAITING_APPROVAL'].includes(p.status));
    cert = (await db.select().from(certificates).where(and(eq(certificates.assessmentId, a.id), eq(certificates.status, 'ACTIVE'))).orderBy(desc(certificates.issuedAt)))[0];
    visit = (await db.select().from(visits).where(eq(visits.assessmentId, a.id)))[0];
    const base = `/portal/assessments/${a.id}`;
    switch (a.status) {
      case 'DRAFT': case 'AWAITING_PAYMENT':
        next = { title: 'ادفع رسوم التقييم لبدء التعبئة', text: pendingPay?.status === 'AWAITING_APPROVAL' ? 'استلمنا إيصال التحويل، وهو بانتظار اعتماد الإدارة.' : `المبلغ ${fmtSAR(Number(pendingPay?.total ?? certQuote.total))} شاملاً الضريبة. بعد الدفع تُفتح الأسئلة ورفع الملفات فوراً.`, icon: <CreditCard />, cta: pendingPay && pendingPay.status !== 'AWAITING_APPROVAL' ? <ButtonLink href={`/portal/checkout/${pendingPay.id}`} variant="lime" size="lg">إتمام الدفع <ArrowLeft className="size-5" /></ButtonLink> : undefined }; break;
      case 'DATA_COLLECTION':
        next = { title: prog!.missingDocs.length ? `ارفع ${prog!.missingDocs.length} ملفات أساسية متبقية` : prog!.answered < prog!.total ? `أجب عن ${prog!.total - prog!.answered} سؤالاً متبقياً` : 'ملفك مكتمل: أرسله للمراجعة', text: 'كل معيار دون إجابة أو دليل يُقدّر بالمستوى 0. تعرض لك قائمة الجاهزية ما ينقص ملفك.', icon: <FileUp />,
          cta: <div className="flex flex-wrap gap-2"><ButtonLink href={`${base}/questions`} variant="lime" size="lg">الأسئلة</ButtonLink><ButtonLink href={`${base}/documents`} variant="outline" size="lg" className="bg-transparent text-white border-white/30 hover:text-lime-brand hover:border-lime-brand">الملفات</ButtonLink></div> }; break;
      case 'SUBMITTED': next = { title: 'طلبك أُرسل للمراجعة', text: 'سيُسند إليه خبير معتمد قريباً، وستصلك الإشعارات بكل تحديث.', icon: <Hourglass /> }; break;
      case 'UNDER_REVIEW': next = { title: 'طلبك لدى خبير مراجع', text: 'يراجع الخبير المعتمد إجاباتك وأدلتك معياراً معياراً.', icon: <ListChecks /> }; break;
      case 'INFO_REQUESTED': next = { title: `الخبير يطلب ${openReqs} استيضاحات`, text: 'أجب عنها وارفع ما يلزم ليستكمل الخبير التقييم.', icon: <MessageSquareWarning />, cta: <ButtonLink href={`${base}/requests`} variant="lime" size="lg">الرد على الاستيضاحات</ButtonLink> }; break;
      case 'DESK_COMPLETED': next = { title: 'صدرت نتيجتك غير الموثقة', text: 'للحصول على الشهادة الموثقة والتقرير التعقيبي اطلب التوثيق الميداني.', icon: <Award />, cta: <div className="flex flex-wrap gap-2"><ButtonLink href={`${base}/result`} variant="lime" size="lg">عرض النتيجة</ButtonLink><ButtonLink href={`${base}/verification`} variant="outline" size="lg" className="bg-transparent text-white border-white/30 hover:text-lime-brand hover:border-lime-brand">طلب التوثيق</ButtonLink></div> }; break;
      case 'VERIFICATION': next = { title: visit?.status === 'SCHEDULED' ? `زيارة التحقق في ${fmtDate(visit.scheduledAt)}` : visit?.status === 'IN_PROGRESS' ? 'زيارة التحقق قيد التنفيذ' : visit?.status === 'COMPLETED' ? 'اكتملت الزيارة: الشهادة قيد الاعتماد' : visit?.status === 'PAID' ? 'رسوم التوثيق مدفوعة: بانتظار تحديد الموعد' : 'أكمل طلب التوثيق', text: 'سيتحقق خبير ميداني من الأدلة بعينة تتبع ومقابلات، ثم يصدر التقرير التعقيبي.', icon: <CalendarCheck />, cta: <ButtonLink href={`${base}/verification`} variant="lime" size="lg">تفاصيل الزيارة</ButtonLink> }; break;
      case 'CERTIFIED': next = { title: 'شهادتك الموثقة صادرة', text: `سارية حتى ${fmtDate(cert?.validUntil)}.`, icon: <Award />, cta: <ButtonLink href="/portal/certificates" variant="lime" size="lg">عرض الشهادة</ButtonLink> }; break;
    }
  }
  const acts = a ? await db.select().from(activityLogs).where(eq(activityLogs.assessmentId, a.id)).orderBy(desc(activityLogs.createdAt)).limit(7) : [];
  const res = (a?.finalResult ?? a?.deskResult) as { total: number; level: string; status: string } | null;

  return (
    <div className="space-y-6">
      {sp.paid && <div className="rounded-2xl bg-forest-100 px-5 py-4 font-semibold text-forest-800 ring-1 ring-forest-300 animate-rise">تم الدفع بنجاح ✓ يمكنك البدء الآن.</div>}
      <section className="relative overflow-hidden rounded-[1.5rem] bg-mesh p-7 text-white md:p-9 animate-rise">
        <div className="absolute inset-0 bg-grid-dark" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
              <span>{org.name}</span><span>·</span><span>المسار {org.track ? TRACK_LABEL[org.track] : '—'} ({org.track ? TRACK_RANGE[org.track] : ''})</span>
              {a && <><span>·</span><span className="ltr">{a.number}</span> <StatusBadge status={a.status} /></>}
            </div>
            <div className="mt-5 flex items-start gap-4">
              <div className="hidden size-14 shrink-0 place-items-center rounded-2xl bg-lime-brand text-forest-950 sm:grid">{next.icon}</div>
              <div><div className="text-sm text-lime-brand">الخطوة التالية</div><h1 className="mt-1 font-display text-2xl font-bold md:text-3xl">{next.title}</h1><p className="mt-2 max-w-xl leading-7 text-white/75">{next.text}</p></div>
            </div>
            {next.cta && <div className="mt-6">{next.cta}</div>}
          </div>
          {a && res ? (
            <div className="rounded-2xl bg-white p-5 text-ink"><div className="mb-3 text-xs font-semibold text-forest-600">{a.status === 'CERTIFIED' ? 'النتيجة الموثقة' : 'النتيجة غير الموثقة'}</div><EfficiencyLabel level={res.level} score={res.total} compact qualified={res.status === 'مؤهل'} /></div>
          ) : a && prog ? (
            <div className="flex items-center justify-center gap-6 rounded-2xl bg-white/[.07] p-6 backdrop-blur">
              <Ring value={prog.progress} size={132} color="#C4D42A" label={<span className="text-white">{prog.progress}٪</span>} sub={<span className="text-white/60">اكتمال الملف</span>} />
              <div className="space-y-2 text-sm"><div><span className="font-display text-xl font-bold num">{prog.answered}</span><span className="text-white/60"> / {prog.total} سؤالاً</span></div><div><span className="font-display text-xl font-bold num">{prog.docsDone}</span><span className="text-white/60"> / {prog.docsTotal} ملفات أساسية</span></div></div>
            </div>
          ) : null}
        </div>
      </section>

      {org.verificationStatus !== 'VERIFIED' && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line"><ShieldAlert className="size-5 shrink-0 text-amber-600" /><div className="min-w-0 flex-1 text-sm"><b>حساب الجهة: {VERIFICATION_LABEL[org.verificationStatus].label}.</b> <span className="text-muted">{VERIFICATION_LABEL[org.verificationStatus].hint}. لا يمنع ذلك تقديم طلب التقييم، لكنه لازم قبل التوثيق الميداني.</span></div><ButtonLink href={`/portal/onboarding?org=${org.id}`} variant="outline" size="sm">بيانات الجهة</ButtonLink></div>
      )}

      <JourneyTrack status={a?.status} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {a && prog && ['DATA_COLLECTION', 'INFO_REQUESTED'].includes(a.status) ? <ReadinessPanel p={prog} base={`/portal/assessments/${a.id}`} openRequests={openReqs} limit={5} /> : (
            <Card className="p-6">
              <CardTitle icon={<Sparkles className="size-5" />} title={a ? 'حالة طلبك' : 'ابدأ بطلب التقييم'} subtitle={a ? 'تابع مراحل الطلب من الشريط أعلاه' : 'بعد الدفع تُفتح الأسئلة ورفع الملفات'} />
              <p className="mt-3 text-sm leading-7 text-muted">{a ? 'ستصلك إشعارات داخل المنصة وعلى بريدك عند كل تحديث. ويمكنك مراسلة الخبير المراجع للاستفسار في أي وقت.' : 'تُعرض هنا قائمة جاهزية ملفك ونواقصه مرتبة بالأولوية بعد بدء الطلب.'}</p>
            </Card>
          )}
          {a && <TeamCard a={a} />}
        </div>
        <Card className="p-6">
          <CardTitle title="آخر التحديثات" />
          {acts.length ? (
            <ol className="relative space-y-5 border-s-2 border-forest-100 ps-5">
              {acts.map(x => <li key={x.id} className="relative"><span className="absolute -start-[27px] top-1 size-3 rounded-full border-2 border-white bg-forest-500" /><div className="text-sm font-semibold">{ACTION_LABEL[x.action] ?? x.action}</div><div className="text-xs text-muted">{fmtRel(x.createdAt)}</div></li>)}
            </ol>
          ) : <p className="text-sm text-muted">لا توجد تحديثات بعد.</p>}
          {cert && <Link href="/portal/certificates" className="mt-6 flex items-center gap-3 rounded-xl bg-forest-900 p-4 text-white"><Award className="size-6 text-lime-brand" /><div><div className="text-sm font-semibold">{cert.type === 'VERIFIED' ? 'شهادة موثقة' : 'إفادة غير موثقة'} · {cert.number}</div><div className="text-xs text-white/60">سارية حتى {fmtDate(cert.validUntil)}</div></div></Link>}
        </Card>
      </div>
    </div>
  );
}
