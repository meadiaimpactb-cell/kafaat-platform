import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { BadgeCheck, CalendarDays, Check, ClipboardCheck, FileText, MapPin, Phone, Printer, Search, ShieldAlert, Users } from 'lucide-react';
import { db, visits, payments, certificates, organizations, visitEvents } from '@/db';
import { loadOwn } from '@/lib/portal';
import { quote } from '@/lib/payments';
import { Card, CardTitle, ButtonLink, Empty, Badge } from '@/components/ui';
import { VisitForm, ConfirmVisitForm, ProposeVisitForm } from '@/components/portal/respond-form';
import { TeamCard } from '@/components/portal/team-card';
import { fmtDate, fmtRel, fmtSAR } from '@/lib/format';
import { VISIT_STATUS_LABEL, VISIT_EVENT_LABEL } from '@/lib/domain';
import { cn } from '@/lib/cn';

export const metadata = { title: 'التوثيق الميداني' };
const STEPS = [{ k: 'REQ', t: 'الطلب' }, { k: 'PAID', t: 'دفع الرسوم' }, { k: 'SCHEDULED', t: 'تحديد الموعد' }, { k: 'COMPLETED', t: 'الزيارة الميدانية' }, { k: 'REPORT', t: 'التقرير والشهادة' }];

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const { a, hasResult } = await loadOwn(id);
  if (!hasResult) return <Empty title="التوثيق متاح بعد صدور النتيجة غير الموثقة" />;
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, id)).limit(1))[0];
  const pay = (await db.select().from(payments).where(eq(payments.assessmentId, id))).filter(p => p.product === 'VERIFICATION_VISIT').sort((x, y) => +y.createdAt - +x.createdAt)[0];
  const cert = (await db.select().from(certificates).where(eq(certificates.assessmentId, id))).find(c => c.type === 'VERIFIED' && c.status === 'ACTIVE');
  const events = v ? await db.select().from(visitEvents).where(eq(visitEvents.visitId, v.id)).orderBy(desc(visitEvents.createdAt)).limit(10) : [];
  const q = await quote('VERIFICATION_VISIT');
  const verified = org.verificationStatus === 'VERIFIED';
  const stage = a.status === 'CERTIFIED' ? 5 : v?.status === 'COMPLETED' ? 4 : v && ['SCHEDULED', 'IN_PROGRESS'].includes(v.status) ? 3 : v?.status === 'PAID' ? 2 : v ? 1 : 0;
  const fu = v?.followupStatus === 'PUBLISHED' ? v.followup : null;

  return (
    <div className="space-y-6">
      {sp.paid && <div className="rounded-2xl bg-forest-100 px-5 py-4 font-semibold text-forest-800 ring-1 ring-forest-300">تم دفع رسوم التوثيق ✓ سيتواصل معكم فريق التحقق لتحديد الموعد.</div>}
      {!verified && (
        <Card className="flex flex-wrap items-center gap-4 border-amber-300 bg-amber-50 p-5">
          <ShieldAlert className="size-6 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1 text-sm leading-7"><b>يلزم توثيق حساب الجهة أولاً.</b> تراجع الإدارة بيانات جهتك ومستنداتها (الترخيص ورقمه وخطاب التفويض) للتأكد من مطابقتها قبل التوثيق الميداني. حالتها الآن: <b>{org.verificationStatus === 'PENDING' ? 'قيد التوثيق' : org.verificationStatus === 'REJECTED' ? 'يلزم تصحيح' : 'غير موثقة'}</b>.{org.verificationStatus === 'REJECTED' && org.verificationNote ? ` ملاحظة الإدارة: ${org.verificationNote}` : ''}</div>
          <ButtonLink href={`/portal/onboarding?org=${org.id}#docs`} variant="outline" size="sm">مراجعة البيانات والمستندات</ButtonLink>
        </Card>
      )}
      <Card className="p-6">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => { const done = i < stage, on = i === stage; return (
            <li key={s.k} className="text-center"><div className={cn('mx-auto mb-2 h-1.5 rounded-full', done ? 'bg-forest-700' : on ? 'spectrum-rtl' : 'bg-forest-100')} /><div className={cn('text-xs font-semibold md:text-sm', done ? 'text-forest-800' : on ? 'text-ink' : 'text-muted')}>{done && <Check className="me-1 inline size-3.5" />}{s.t}</div></li>
          ); })}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="p-7">
            <CardTitle title="ما الذي يتضمنه التوثيق؟" subtitle="يتحقق خبير ميداني من أن الأدلة المرفوعة تعكس الواقع، فتتحول النتيجة إلى شهادة موثقة، ويصدر لكم تقرير تعقيبي" icon={<ClipboardCheck className="size-5" />} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[{ i: Search, t: 'تتبع عينة من المستفيدين', d: 'من السجل إلى النتيجة: هل بلغوا العتبة فعلاً؟' }, { i: Users, t: 'مقابلات مع الفريق والمستفيدين', d: 'للتحقق من طريقة القياس وسلامة الاستهداف' }, { i: ClipboardCheck, t: 'مراجعة الأنظمة والسجلات', d: 'نظام البيانات، والصلاحيات، ومسار التدقيق' }, { i: FileText, t: 'تقرير تعقيبي مكتوب', d: 'ملخص ونقاط قوة وملاحظات وتوصيات عملية بعد الزيارة' }].map(x => (
                <div key={x.t} className="flex gap-3 rounded-2xl bg-forest-50 p-4"><x.i className="mt-0.5 size-5 shrink-0 text-forest-700" /><div><div className="font-semibold">{x.t}</div><div className="text-sm text-muted">{x.d}</div></div></div>
              ))}
            </div>
            {v && (
              <dl className="mt-6 grid gap-3 rounded-2xl border border-line p-5 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">حالة الزيارة</dt><dd className="font-semibold">{VISIT_STATUS_LABEL[v.status]?.label}{v.status === 'SCHEDULED' && <Badge tone={v.orgConfirmedAt ? 'green' : 'amber'} className="ms-2">{v.orgConfirmedAt ? 'مؤكدة منكم' : 'بانتظار تأكيدكم'}</Badge>}</dd></div>
                <div><dt className="flex items-center gap-1.5 text-muted"><CalendarDays className="size-4" /> الموعد</dt><dd className="font-semibold">{v.scheduledAt ? fmtDate(v.scheduledAt, true) : v.preferredDates ? `المفضل: ${v.preferredDates}` : 'يُحدد بعد الدفع'}</dd></div>
                <div><dt className="flex items-center gap-1.5 text-muted"><MapPin className="size-4" /> المقر</dt><dd className="font-semibold">{v.location ?? '—'}</dd></div>
                <div><dt className="flex items-center gap-1.5 text-muted"><Phone className="size-4" /> من يستقبل الخبير</dt><dd className="font-semibold">{v.siteContactName ? `${v.siteContactName} ${v.siteContactPhone ?? ''}` : '—'}</dd></div>
                {v.sampleResult && <div className="sm:col-span-2"><dt className="text-muted">نتيجة عينة التتبع</dt><dd className="font-semibold num">{v.sampleResult.matched} مطابقة من {v.sampleResult.checked} حالة</dd></div>}
              </dl>
            )}
            {v && v.status === 'SCHEDULED' && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {!v.orgConfirmedAt && <div className="rounded-2xl bg-lime-100/60 p-4"><div className="mb-2 text-sm font-semibold">هل الموعد مناسب؟</div><ConfirmVisitForm assessmentId={id} /></div>}
                <div className="rounded-2xl border border-line p-4"><div className="mb-3 text-sm font-semibold">اقتراح موعد بديل أو تحديث بيانات الاستقبال</div><ProposeVisitForm assessmentId={id} defaults={v} /></div>
              </div>
            )}
          </Card>
          {fu && v && (
            <Card className="p-7">
              <CardTitle title="التقرير التعقيبي" subtitle={v.followupPublishedAt ? `صدر في ${fmtDate(v.followupPublishedAt)}` : undefined} icon={<FileText className="size-5" />} action={<ButtonLink href={`/print/followup/${v.id}`} target="_blank" variant="outline" size="sm"><Printer className="size-4" /> عرض وطباعة</ButtonLink>} />
              <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-ink-2">{fu.summary}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {([['نقاط القوة', fu.strengths, 'bg-forest-50'], ['الملاحظات', fu.findings, 'bg-amber-50'], ['التوصيات', fu.recommendations, 'bg-lime-100/60']] as const).map(([t, list, bg]) => list.length > 0 && <div key={t} className={cn('rounded-2xl p-4', bg)}><div className="mb-2 text-sm font-semibold">{t}</div><ul className="space-y-1.5 text-sm leading-6">{list.map((x, i) => <li key={i}>• {x}</li>)}</ul></div>)}
              </div>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card className="h-fit p-7">
            {a.status === 'CERTIFIED' ? (
              <div className="space-y-4 text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-forest-800 text-lime-brand"><BadgeCheck className="size-8" /></div><div className="font-display text-xl font-bold">صدرت شهادتكم الموثقة</div>{cert && <ButtonLink href={`/print/certificate/${cert.id}`} target="_blank" variant="lime" className="w-full">عرض الشهادة وطباعتها</ButtonLink>}</div>
            ) : pay?.status === 'PAID' ? (
              <div className="space-y-2"><div className="font-display text-lg font-semibold">رسوم التوثيق مدفوعة</div><p className="text-sm text-muted">{v?.status === 'SCHEDULED' ? 'استعدوا لاستقبال الخبير في الموعد المحدد، وجهزوا السجلات الأصلية.' : v?.status === 'IN_PROGRESS' ? 'الزيارة قيد التنفيذ الآن.' : v?.status === 'COMPLETED' ? 'اكتملت الزيارة، والتقرير التعقيبي والشهادة الموثقة قيد الإعداد والاعتماد.' : 'سيتواصل معكم فريق التحقق لتأكيد الموعد خلال يومي عمل.'}</p></div>
            ) : pay && ['PENDING', 'FAILED', 'AWAITING_APPROVAL'].includes(pay.status) ? (
              <div className="space-y-3"><div className="font-display text-lg font-semibold">أكمل دفع رسوم التوثيق</div><div className="font-display text-3xl font-black num">{fmtSAR(pay.total)}</div>{pay.status === 'AWAITING_APPROVAL' ? <p className="text-sm text-muted">إيصال التحويل بانتظار الاعتماد.</p> : <ButtonLink href={`/portal/checkout/${pay.id}`} variant="lime" size="lg" className="w-full">إتمام الدفع</ButtonLink>}</div>
            ) : !verified ? (
              <div className="space-y-2"><div className="text-sm text-muted">رسوم التوثيق</div><div className="font-display text-4xl font-black num">{fmtSAR(q.total)}</div><p className="text-sm text-muted">تشمل الزيارة الميدانية والتقرير التعقيبي. يُفتح الطلب بعد توثيق حساب الجهة.</p></div>
            ) : (
              <div className="space-y-5">
                <div><div className="text-sm text-muted">رسوم التوثيق (تشمل التقرير التعقيبي)</div><div className="font-display text-4xl font-black num">{fmtSAR(q.total)}</div><div className="text-xs text-muted">{q.includesVat ? `شامل ضريبة القيمة المضافة ${q.vatRate}٪` : `+ ضريبة ${q.vatRate}٪`}</div></div>
                <VisitForm assessmentId={id} defaults={v ?? undefined} />
              </div>
            )}
          </Card>
          <TeamCard a={a} stage="VERIFY" />
          {events.length > 0 && (
            <Card className="p-6"><CardTitle title="سجل الزيارة" /><ol className="mt-4 space-y-2.5 text-sm">{events.map(e => <li key={e.id} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-forest-500" /><span className="flex-1">{VISIT_EVENT_LABEL[e.type] ?? e.type}</span><span className="text-xs text-muted">{fmtRel(e.createdAt)}</span></li>)}</ol></Card>
          )}
        </div>
      </div>
    </div>
  );
}
