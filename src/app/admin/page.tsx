import Link from 'next/link';
import { and, count, desc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { ArrowLeft, Award, Banknote, ClipboardList, Gauge, Hourglass, MapPin, UserPlus, WalletCards } from 'lucide-react';
import { db, assessments, payments, certificates, visits, organizations, activityLogs, users } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Stat, Card, CardTitle, Badge } from '@/components/ui';
import { RevenueChart } from '@/components/admin/charts';
import { STATUS, CERT_SCALE } from '@/lib/domain';
import { fmtSAR, fmtRel, fmtNum } from '@/lib/format';
import type { AssessmentStatus } from '@/db/schema';

export const metadata = { title: 'لوحة التحكم' };
const ACT: Record<string, string> = { 'assessment.created': 'طلب تقييم جديد', 'payment.paid': 'دفعة مكتملة', 'document.uploaded': 'رفع ملف', 'assessment.submitted': 'إرسال للمراجعة', 'assessment.assigned': 'إسناد مقيّم', 'review.started': 'بدء مراجعة', 'info.requested': 'طلب استيضاح', 'desk.completed': 'اعتماد مكتبي', 'visit.requested': 'طلب زيارة', 'visit.scheduled': 'جدولة زيارة', 'visit.completed': 'إنهاء زيارة', 'certificate.verified': 'شهادة موثقة', 'payment.approved': 'اعتماد تحويل' };

export default async function Page({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const u = await requireStaff(); const sp = await searchParams;
  const year = new Date().getFullYear(); const y0 = new Date(Date.UTC(year, 0, 1));
  const [paidRows, byStatus, certs, avg, unassigned, awaiting, toSchedule, toIssue, acts, orgCount] = await Promise.all([
    db.select({ total: payments.total, product: payments.product, paidAt: payments.paidAt }).from(payments).where(and(eq(payments.status, 'PAID'), gte(payments.paidAt, new Date(Date.UTC(year - 1, new Date().getMonth(), 1))))),
    db.select({ s: assessments.status, c: count() }).from(assessments).groupBy(assessments.status),
    db.select({ t: certificates.type, level: certificates.level, c: count() }).from(certificates).where(eq(certificates.status, 'ACTIVE')).groupBy(certificates.type, certificates.level),
    db.select({ v: sql<number>`avg(coalesce(${assessments.finalScore}, ${assessments.deskScore}))` }).from(assessments),
    db.select({ a: assessments, org: organizations.name }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(and(eq(assessments.status, 'SUBMITTED'), isNull(assessments.assessorId))),
    db.select({ p: payments, org: organizations.name }).from(payments).innerJoin(organizations, eq(organizations.id, payments.orgId)).where(eq(payments.status, 'AWAITING_APPROVAL')),
    db.select({ v: visits, a: assessments, org: organizations.name }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(eq(visits.status, 'PAID')),
    db.select({ v: visits, a: assessments, org: organizations.name }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(and(eq(visits.status, 'COMPLETED'), eq(assessments.status, 'VERIFICATION'))),
    db.select({ l: activityLogs, who: users.name }).from(activityLogs).leftJoin(users, eq(users.id, activityLogs.userId)).orderBy(desc(activityLogs.createdAt)).limit(12),
    db.select({ c: count() }).from(organizations),
  ]);
  const ytd = paidRows.filter(p => p.paidAt && p.paidAt >= y0).reduce((s, p) => s + Number(p.total), 0);
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 11 + i, 1); return { k: `${d.getFullYear()}-${d.getMonth()}`, m: d.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { month: 'short' }), v: 0 }; });
  for (const p of paidRows) { if (!p.paidAt) continue; const k = `${p.paidAt.getFullYear()}-${p.paidAt.getMonth()}`; const m = months.find(x => x.k === k); if (m) m.v += Number(p.total); }
  const st = Object.fromEntries(byStatus.map(r => [r.s, r.c])) as Record<AssessmentStatus, number>;
  const totalA = byStatus.reduce((s, r) => s + r.c, 0);
  const levelDist = CERT_SCALE.map(s => ({ ...s, c: certs.filter(c => c.level === s.key).reduce((a, c) => a + c.c, 0) }));
  const maxL = Math.max(1, ...levelDist.map(l => l.c));
  const queues = [
    { t: 'طلبات بانتظار إسناد مقيّم', i: UserPlus, rows: unassigned.map(x => ({ id: x.a.id, title: x.org, sub: x.a.number, href: `/admin/assessments/${x.a.id}` })), show: can(u, 'assessments.assign') },
    { t: 'تحويلات بنكية بانتظار الاعتماد', i: Banknote, rows: awaiting.map(x => ({ id: x.p.id, title: x.org, sub: `${x.p.number} · ${fmtSAR(x.p.total)}`, href: `/admin/payments?status=AWAITING_APPROVAL` })), show: can(u, 'payments.approve') },
    { t: 'زيارات مدفوعة بانتظار الجدولة', i: MapPin, rows: toSchedule.map(x => ({ id: x.v.id, title: x.org, sub: x.a.number, href: `/admin/visits` })), show: can(u, 'visits.manage') },
    { t: 'شهادات موثقة بانتظار الإصدار', i: Award, rows: toIssue.map(x => ({ id: x.v.id, title: x.org, sub: x.a.number, href: `/admin/assessments/${x.a.id}` })), show: can(u, 'certificates.issue') },
  ].filter(q => q.show);
  const pipeline: AssessmentStatus[] = ['AWAITING_PAYMENT', 'DATA_COLLECTION', 'SUBMITTED', 'UNDER_REVIEW', 'INFO_REQUESTED', 'DESK_COMPLETED', 'VERIFICATION', 'CERTIFIED'];

  return (
    <div className="space-y-6">
      {sp.denied && <div className="rounded-2xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">لا تملك صلاحية الوصول إلى الصفحة المطلوبة. تواصل مع الأدمن.</div>}
      <PageHeader eyebrow={`مرحباً ${u.name}`} title="لوحة التحكم" subtitle="صورة لحظية للطلبات والإيرادات والشهادات، وقوائم العمل التي تنتظرك." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {can(u, 'payments.view') && <Stat label={`الإيرادات ${year}`} value={fmtSAR(ytd)} icon={<WalletCards className="size-5" />} hint={`${paidRows.length} دفعة خلال 12 شهراً`} />}
        <Stat label="طلبات التقييم" value={fmtNum(totalA)} icon={<ClipboardList className="size-5" />} hint={`${orgCount[0].c} جهة مسجلة`} tone="lime" />
        <Stat label="شهادات سارية" value={fmtNum(certs.reduce((s, c) => s + c.c, 0))} icon={<Award className="size-5" />} hint={`موثقة ${certs.filter(c => c.t === 'VERIFIED').reduce((s, c) => s + c.c, 0)}`} tone="amber" />
        <Stat label="متوسط الدرجة" value={fmtNum(avg[0]?.v ?? 0, 1)} icon={<Gauge className="size-5" />} hint="من 100" tone="orange" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {can(u, 'payments.view') ? <Card className="p-6"><CardTitle title="الإيرادات الشهرية" subtitle="آخر 12 شهراً (ر.س)" /><div className="mt-4"><RevenueChart data={months.map(({ m, v }) => ({ m, v }))} /></div></Card> : <Card className="p-6"><CardTitle title="الإيرادات" subtitle="لا تملك صلاحية عرض المالية" /></Card>}
        <Card className="p-6">
          <CardTitle title="مسار الطلبات" subtitle="عدد الطلبات في كل مرحلة" />
          <div className="mt-4 space-y-2.5">{pipeline.map(s => { const c = st[s] ?? 0; return (
            <Link key={s} href={`/admin/assessments?status=${s}`} className="group block"><div className="flex justify-between text-sm"><span className="group-hover:text-forest-700">{STATUS[s].label}</span><span className="num font-semibold">{c}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full bg-forest-700" style={{ width: `${totalA ? (c / totalA) * 100 : 0}%` }} /></div></Link>
          ); })}</div>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {queues.map(q => (
          <Card key={q.t} className="flex flex-col p-5">
            <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-forest-950 text-lime-brand"><q.i className="size-5" /></div><div className="flex-1 text-sm font-semibold leading-5">{q.t}</div><span className={`grid min-w-7 place-items-center rounded-full px-2 py-0.5 text-sm font-bold num ${q.rows.length ? 'bg-orange-brand text-white' : 'bg-forest-50 text-muted'}`}>{q.rows.length}</span></div>
            <ul className="mt-4 flex-1 space-y-1.5">{q.rows.slice(0, 4).map(r => <li key={r.id}><Link href={r.href} className="flex items-center justify-between gap-2 rounded-xl p-2 text-sm hover:bg-forest-50"><div className="min-w-0"><div className="truncate font-semibold">{r.title}</div><div className="ltr truncate text-right text-xs text-muted">{r.sub}</div></div><ArrowLeft className="size-4 shrink-0 text-muted" /></Link></li>)}{!q.rows.length && <li className="flex items-center gap-2 p-2 text-sm text-muted"><Hourglass className="size-4" /> لا شيء معلق</li>}</ul>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <CardTitle title="توزيع مستويات الشهادات السارية" />
          <div className="mt-5 space-y-3">{levelDist.map(l => <div key={l.key} className="flex items-center gap-3"><span className="w-14 text-sm font-semibold">{l.key}</span><div className="h-7 flex-1 overflow-hidden rounded-lg bg-forest-50"><div className="flex h-full items-center justify-end rounded-lg px-2 text-xs font-bold text-white" style={{ width: `${Math.max(l.c ? 8 : 0, (l.c / maxL) * 100)}%`, background: l.color }}>{l.c || ''}</div></div></div>)}</div>
        </Card>
        <Card className="p-6">
          <CardTitle title="آخر النشاط" action={can(u, 'audit.view') ? <Link href="/admin/audit" className="text-sm font-semibold text-forest-700">السجل الكامل</Link> : null} />
          <ul className="mt-4 divide-y divide-line">{acts.map(({ l, who }) => <li key={l.id} className="flex items-center gap-3 py-2.5 text-sm">{l.assessmentId ? <Link href={`/admin/assessments/${l.assessmentId}`} className="flex-1 hover:text-forest-700"><b>{ACT[l.action] ?? l.action}</b> <span className="text-muted">· {who ?? 'النظام'}</span></Link> : <span className="flex-1"><b>{ACT[l.action] ?? l.action}</b> <span className="text-muted">· {who ?? 'النظام'}</span></span>}<Badge>{fmtRel(l.createdAt)}</Badge></li>)}</ul>
        </Card>
      </div>
    </div>
  );
}
