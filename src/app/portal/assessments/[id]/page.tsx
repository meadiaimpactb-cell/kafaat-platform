import Link from 'next/link';
import { and, desc, eq } from 'drizzle-orm';
import { ArrowLeft, Check, CreditCard, FileText, ListChecks, MessageSquareWarning, X, Hourglass, UserCheck, Award } from 'lucide-react';
import { db, payments, activityLogs, infoRequests } from '@/db';
import { loadOwn } from '@/lib/portal';
import { recomputeProgress } from '@/lib/workflow';
import { Card, CardTitle, ButtonLink, Progress } from '@/components/ui';
import { SubmitAssessmentButton } from '@/components/portal/assessment-actions';
import { ReadinessPanel } from '@/components/portal/readiness-panel';
import { TeamCard } from '@/components/portal/team-card';
import { fmtRel, fmtSAR } from '@/lib/format';
import { cn } from '@/lib/cn';

const ACT: Record<string, string> = {
  'assessment.created': 'أُنشئ طلب التقييم', 'payment.paid': 'اكتمل الدفع', 'document.uploaded': 'رُفع ملف', 'assessment.submitted': 'أُرسل الطلب للمراجعة', 'assessment.assigned': 'أُسند الطلب لخبير مراجع', 'assessment.verifier': 'عُيّن خبير التحقق', 'visit.confirmed': 'أُكد موعد الزيارة', 'visit.followup': 'صدر التقرير التعقيبي',
  'review.started': 'بدأت المراجعة', 'info.requested': 'طُلب استيضاح', 'assessment.resubmitted': 'أُعيد الإرسال بعد الاستيضاح', 'desk.completed': 'صدرت النتيجة غير الموثقة', 'visit.requested': 'طُلبت زيارة التحقق',
  'visit.scheduled': 'جُدولت زيارة التحقق', 'visit.completed': 'اكتملت زيارة التحقق', 'certificate.verified': 'صدرت الشهادة الموثقة', 'payment.approved': 'اعتُمد التحويل البنكي',
};

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const { a, editable } = await loadOwn(id);
  const base = `/portal/assessments/${id}`;
  const p = await recomputeProgress(id);
  const pay = (await db.select().from(payments).where(eq(payments.assessmentId, id))).find(x => x.product === 'CERTIFICATE' && ['PENDING', 'FAILED', 'AWAITING_APPROVAL'].includes(x.status));
  const open = await db.select().from(infoRequests).where(and(eq(infoRequests.assessmentId, id), eq(infoRequests.status, 'OPEN')));
  const acts = await db.select().from(activityLogs).where(eq(activityLogs.assessmentId, id)).orderBy(desc(activityLogs.createdAt)).limit(10);
  const need = Math.ceil(p.total * 0.7);
  const checks = [
    { ok: p.answered >= need, t: 'الإجابة عن 70٪ من المعايير على الأقل', d: `${p.answered} من ${p.total} (المطلوب ${need})`, href: `${base}/questions` },
    { ok: !p.missingDocs.length, t: 'رفع الملفات الأساسية للمسار', d: p.missingDocs.length ? `ينقص: ${p.missingDocs.map(m => m.title).join('، ')}` : `${p.docsDone} من ${p.docsTotal} مكتملة`, href: `${base}/documents` },
    { ok: !open.length, t: 'الرد على استيضاحات الخبير', d: open.length ? `${open.length} بانتظار ردك` : 'لا توجد استيضاحات مفتوحة', href: `${base}/requests` },
  ];
  const ready = checks.every(c => c.ok);

  return (
    <div className="space-y-6">
      {sp.paid && <div className="rounded-2xl bg-forest-100 px-5 py-4 font-semibold text-forest-800 ring-1 ring-forest-300 animate-rise">تم الدفع بنجاح ✓ فُتحت لك الأسئلة ورفع الملفات، وصدرت فاتورتك الضريبية في صفحة المدفوعات.</div>}
      {a.status === 'AWAITING_PAYMENT' && (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-800"><CreditCard /></div><div><div className="font-display text-lg font-semibold">{pay?.status === 'AWAITING_APPROVAL' ? 'إيصال التحويل بانتظار الاعتماد' : 'ادفع رسوم التقييم لفتح الأسئلة والملفات'}</div><div className="text-sm text-muted">{pay ? fmtSAR(pay.total) : ''} شاملاً الضريبة</div></div></div>
          {pay && pay.status !== 'AWAITING_APPROVAL' && <ButtonLink href={`/portal/checkout/${pay.id}`} variant="lime" size="lg">إتمام الدفع <ArrowLeft className="size-5" /></ButtonLink>}
        </Card>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          {editable && (
            <Card className="p-6">
              <CardTitle title="جاهزية الإرسال للمراجعة" subtitle="أكمل البنود الثلاثة ثم أرسل ملفك للمراجعة" icon={<ListChecks className="size-5" />} />
              <ul className="mt-5 space-y-3">
                {checks.map(c => (
                  <li key={c.t}><Link href={c.href} className="flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-forest-400">
                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full', c.ok ? 'bg-forest-700 text-white' : 'bg-orange-50 text-orange-brand ring-1 ring-orange-200')}>{c.ok ? <Check className="size-5" /> : <X className="size-5" />}</span>
                    <div className="min-w-0 flex-1"><div className="font-semibold">{c.t}</div><div className="truncate text-sm text-muted">{c.d}</div></div>
                    <ArrowLeft className="size-4 text-muted" />
                  </Link></li>
                ))}
              </ul>
              <div className="mt-5"><SubmitAssessmentButton id={id} ready={ready} resubmit={a.status === 'INFO_REQUESTED'} /></div>
            </Card>
          )}
          {['SUBMITTED', 'UNDER_REVIEW'].includes(a.status) && (
            <Card className="flex items-center gap-5 p-6">
              <div className="grid size-14 place-items-center rounded-2xl bg-violet-50 text-violet-700">{a.assessorId ? <UserCheck className="size-6" /> : <Hourglass className="size-6" />}</div>
              <div><div className="font-display text-lg font-semibold">{a.assessorId ? 'طلبكم لدى خبير معتمد' : 'بانتظار إسناد خبير معتمد'}</div><div className="text-sm text-muted">{a.assessorId ? 'يراجع إجاباتك وأدلتك معياراً معياراً، وقد يطلب استيضاحات.' : 'يُسند الطلب عادة خلال يومي عمل.'}</div></div>
            </Card>
          )}
          {['DESK_COMPLETED', 'VERIFICATION', 'CERTIFIED'].includes(a.status) && (
            <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-4"><div className="grid size-12 place-items-center rounded-2xl bg-lime-100 text-forest-800"><Award /></div><div><div className="font-display text-lg font-semibold">النتيجة {a.status === 'CERTIFIED' ? 'الموثقة' : 'غير الموثقة'}: <span className="num">{a.finalScore ?? a.deskScore}</span> من 100</div><div className="text-sm text-muted">المستوى «{a.finalLevel ?? a.deskLevel}»</div></div></div>
              <ButtonLink href={`${base}/result`} variant="lime">عرض التفاصيل</ButtonLink>
            </Card>
          )}
          {editable && <ReadinessPanel p={p} base={base} openRequests={open.length} limit={5} />}
        </div>
        <div className="space-y-6">
          <TeamCard a={a} />
          <Card className="p-6">
            <CardTitle title="ملخص الملف" />
            <div className="mt-5 space-y-4">
              <div><div className="mb-1.5 flex justify-between text-sm"><span>الأسئلة</span><span className="num font-semibold">{p.answered}/{p.total}</span></div><Progress value={(p.answered / p.total) * 100} /></div>
              <div><div className="mb-1.5 flex justify-between text-sm"><span>الملفات الأساسية</span><span className="num font-semibold">{p.docsDone}/{p.docsTotal}</span></div><Progress value={p.docsTotal ? (p.docsDone / p.docsTotal) * 100 : 100} /></div>
            </div>
            {a.status !== 'AWAITING_PAYMENT' && <div className="mt-5 grid grid-cols-2 gap-2"><ButtonLink href={`${base}/questions`} variant="outline" size="sm"><ListChecks className="size-4" /> الأسئلة</ButtonLink><ButtonLink href={`${base}/documents`} variant="outline" size="sm"><FileText className="size-4" /> الملفات</ButtonLink></div>}
            {open.length > 0 && <ButtonLink href={`${base}/requests`} variant="primary" size="sm" className="mt-2 w-full"><MessageSquareWarning className="size-4" /> {open.length} استيضاحات بانتظار ردك</ButtonLink>}
          </Card>
          <Card className="p-6">
            <CardTitle title="سجل الطلب" />
            <ol className="relative mt-5 space-y-4 border-s-2 border-forest-100 ps-5">
              {acts.map(x => (
                <li key={x.id} className="relative"><span className="absolute -start-[27px] top-1 size-3 rounded-full bg-forest-600 ring-4 ring-white" />
                  <div className="text-sm font-semibold">{ACT[x.action] ?? x.action}{x.details && typeof x.details === 'object' && 'file' in x.details ? <span className="font-normal text-muted">: {String(x.details.file)}</span> : null}</div>
                  <div className="text-xs text-muted">{fmtRel(x.createdAt)}</div></li>
              ))}
              {!acts.length && <li className="text-sm text-muted">لا أحداث بعد</li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
