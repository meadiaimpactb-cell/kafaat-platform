import { eq } from 'drizzle-orm';
import { BadgeCheck, CalendarDays, Check, ClipboardCheck, MapPin, Search, UserRound, Users } from 'lucide-react';
import { db, visits, payments, users, certificates } from '@/db';
import { loadOwn } from '@/lib/portal';
import { quote } from '@/lib/payments';
import { Card, CardTitle, ButtonLink, Empty } from '@/components/ui';
import { VisitForm } from '@/components/portal/respond-form';
import { fmtDate, fmtSAR } from '@/lib/format';
import { VISIT_STATUS_LABEL } from '@/lib/domain';
import { cn } from '@/lib/cn';

export const metadata = { title: 'زيارة التحقق' };
const STEPS = [{ k: 'REQ', t: 'الطلب' }, { k: 'PAID', t: 'دفع الرسوم' }, { k: 'SCHEDULED', t: 'تحديد الموعد' }, { k: 'COMPLETED', t: 'الزيارة الميدانية' }, { k: 'CERT', t: 'الشهادة الموثقة' }];

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const { a, hasResult } = await loadOwn(id);
  if (!hasResult) return <Empty title="زيارة التحقق متاحة بعد صدور النتيجة غير الموثقة" />;
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, id)).limit(1))[0];
  const pay = (await db.select().from(payments).where(eq(payments.assessmentId, id))).filter(p => p.product === 'VERIFICATION_VISIT').sort((x, y) => +y.createdAt - +x.createdAt)[0];
  const consultant = v?.consultantId ? (await db.select({ n: users.name, phone: users.phone }).from(users).where(eq(users.id, v.consultantId)))[0] : null;
  const cert = (await db.select().from(certificates).where(eq(certificates.assessmentId, id))).find(c => c.type === 'VERIFIED' && c.status === 'ACTIVE');
  const q = await quote('VERIFICATION_VISIT');
  const stage = a.status === 'CERTIFIED' ? 5 : v?.status === 'COMPLETED' ? 4 : v?.status === 'SCHEDULED' ? 3 : v?.status === 'PAID' ? 2 : v ? 1 : 0;

  return (
    <div className="space-y-6">
      {sp.paid && <div className="rounded-2xl bg-forest-100 px-5 py-4 font-semibold text-forest-800 ring-1 ring-forest-300">تم دفع رسوم زيارة التحقق ✓ سيتواصل معكم فريق التحقق لتحديد الموعد.</div>}
      <Card className="p-6">
        <ol className="grid grid-cols-5 gap-2">
          {STEPS.map((s, i) => { const done = i < stage, on = i === stage; return (
            <li key={s.k} className="text-center"><div className={cn('mx-auto mb-2 h-1.5 rounded-full', done ? 'bg-forest-700' : on ? 'spectrum-rtl' : 'bg-forest-100')} /><div className={cn('text-xs font-semibold md:text-sm', done ? 'text-forest-800' : on ? 'text-ink' : 'text-muted')}>{done && <Check className="me-1 inline size-3.5" />}{s.t}</div></li>
          ); })}
        </ol>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="p-7">
          <CardTitle title="ما الذي تتضمنه زيارة التحقق؟" subtitle="يتحقق مستشار ميداني من أن الأدلة المرفوعة تعكس الواقع، فتتحول النتيجة إلى شهادة موثقة" icon={<ClipboardCheck className="size-5" />} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[{ i: Search, t: 'تتبع عينة من المستفيدين', d: 'من السجل إلى النتيجة: هل بلغوا العتبة فعلاً؟' }, { i: Users, t: 'مقابلات مع الفريق والمستفيدين', d: 'للتحقق من طريقة القياس وسلامة الاستهداف' }, { i: ClipboardCheck, t: 'مراجعة الأنظمة والسجلات', d: 'نظام البيانات، والصلاحيات، ومسار التدقيق' }, { i: BadgeCheck, t: 'اعتماد المستويات النهائية', d: 'تعديل مستويات العوامل وفق ما ثبت ميدانياً' }].map(x => (
              <div key={x.t} className="flex gap-3 rounded-2xl bg-forest-50 p-4"><x.i className="mt-0.5 size-5 shrink-0 text-forest-700" /><div><div className="font-semibold">{x.t}</div><div className="text-sm text-muted">{x.d}</div></div></div>
            ))}
          </div>
          {v && (
            <dl className="mt-6 grid gap-3 rounded-2xl border border-line p-5 text-sm sm:grid-cols-2">
              <div><dt className="text-muted">حالة الزيارة</dt><dd className="font-semibold">{VISIT_STATUS_LABEL[v.status]?.label}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-muted"><CalendarDays className="size-4" /> الموعد</dt><dd className="font-semibold">{v.scheduledAt ? fmtDate(v.scheduledAt, true) : v.preferredDates ? `المفضل: ${v.preferredDates}` : 'يُحدد بعد الدفع'}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-muted"><MapPin className="size-4" /> المقر</dt><dd className="font-semibold">{v.location ?? '—'}</dd></div>
              <div><dt className="flex items-center gap-1.5 text-muted"><UserRound className="size-4" /> المستشار</dt><dd className="font-semibold">{consultant?.n ?? 'يُسند قريباً'}</dd></div>
              {v.sampleResult && <div className="sm:col-span-2"><dt className="text-muted">نتيجة عينة التتبع</dt><dd className="font-semibold num">{v.sampleResult.matched} مطابقة من {v.sampleResult.checked} حالة</dd></div>}
            </dl>
          )}
        </Card>
        <Card className="h-fit p-7">
          {a.status === 'CERTIFIED' ? (
            <div className="space-y-4 text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-forest-800 text-lime-brand"><BadgeCheck className="size-8" /></div><div className="font-display text-xl font-bold">صدرت شهادتكم الموثقة</div>{cert && <ButtonLink href={`/print/certificate/${cert.id}`} target="_blank" variant="lime" className="w-full">عرض الشهادة وطباعتها</ButtonLink>}</div>
          ) : pay?.status === 'PAID' ? (
            <div className="space-y-2"><div className="font-display text-lg font-semibold">رسوم الزيارة مدفوعة</div><p className="text-sm text-muted">{v?.status === 'SCHEDULED' ? 'استعدوا لاستقبال المستشار في الموعد المحدد، وجهزوا السجلات الأصلية.' : v?.status === 'COMPLETED' ? 'اكتملت الزيارة، والشهادة الموثقة قيد الاعتماد النهائي.' : 'سيتواصل معكم فريق التحقق لتأكيد الموعد خلال يومي عمل.'}</p></div>
          ) : pay && ['PENDING', 'FAILED', 'AWAITING_APPROVAL'].includes(pay.status) ? (
            <div className="space-y-3"><div className="font-display text-lg font-semibold">أكمل دفع رسوم الزيارة</div><div className="font-display text-3xl font-black num">{fmtSAR(pay.total)}</div>{pay.status === 'AWAITING_APPROVAL' ? <p className="text-sm text-muted">إيصال التحويل بانتظار الاعتماد.</p> : <ButtonLink href={`/portal/checkout/${pay.id}`} variant="lime" size="lg" className="w-full">إتمام الدفع</ButtonLink>}</div>
          ) : (
            <div className="space-y-5">
              <div><div className="text-sm text-muted">رسوم زيارة التحقق</div><div className="font-display text-4xl font-black num">{fmtSAR(q.total)}</div><div className="text-xs text-muted">{q.includesVat ? `شامل ضريبة القيمة المضافة ${q.vatRate}٪` : `+ ضريبة ${q.vatRate}٪`}</div></div>
              <VisitForm assessmentId={id} defaults={v ? { preferredDates: v.preferredDates, location: v.location } : undefined} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
