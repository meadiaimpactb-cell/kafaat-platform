import Link from 'next/link';
import { notFound } from 'next/navigation';
import { desc, eq, inArray, and } from 'drizzle-orm';
import { db, organizations, users, assessments, payments, certificates } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Card, CardTitle, Badge, LevelBadge } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveOrgAdmin } from '@/app/actions/admin';
import { TRACK_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_LABEL } from '@/lib/domain';
import { fmtDate, fmtSAR, fmtNum } from '@/lib/format';

export const metadata = { title: 'ملف الجهة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const u = await requireStaff('orgs.view');
  const o = (await db.select().from(organizations).where(eq(organizations.id, id)).limit(1))[0]; if (!o) notFound();
  const members = await db.select().from(users).where(eq(users.orgId, id));
  const managers = await db.select({ id: users.id, name: users.name }).from(users).where(and(inArray(users.role, ['ACCOUNT_MANAGER', 'SUPER_ADMIN']), eq(users.active, true)));
  const as = await db.select().from(assessments).where(eq(assessments.orgId, id)).orderBy(desc(assessments.createdAt));
  const pays = await db.select().from(payments).where(eq(payments.orgId, id)).orderBy(desc(payments.createdAt));
  const certs = await db.select().from(certificates).where(eq(certificates.orgId, id)).orderBy(desc(certificates.issuedAt));
  const info: [string, unknown][] = [['رقم الترخيص', o.licenseNo], ['الرقم الموحد', o.unifiedNo], ['النوع', o.orgType], ['المنطقة', o.region], ['المدينة', o.city], ['المجال', o.field], ['سنة التأسيس', o.foundedYear], ['المسار', o.track ? TRACK_LABEL[o.track] : null], ['مصروفات العام الماضي', fmtSAR(o.lastYearExpenses)], ['الإيرادات', fmtSAR(o.lastYearRevenue)], ['مصروفات البرامج', fmtSAR(o.programExpenses)], ['المستفيدون', fmtNum(o.beneficiariesCount)], ['البرامج', o.programsCount], ['الموظفون', o.employeesCount], ['المتطوعون', o.volunteersCount], ['البريد', o.email], ['الهاتف', o.phone], ['الموقع', o.website], ['مسؤول التواصل', o.contactName && `${o.contactName} — ${o.contactTitle ?? ''}`]];
  return (
    <div className="space-y-6">
      <PageHeader title={o.name} subtitle={o.nameEn ?? undefined} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card className="p-6"><CardTitle title="البيانات الرئيسة" /><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">{info.map(([k, v]) => <div key={k} className="rounded-xl bg-forest-50 p-3"><dt className="text-xs text-muted">{k}</dt><dd className="font-semibold">{(v as string) ?? '—'}</dd></div>)}</dl>{o.description && <p className="mt-4 text-sm leading-7 text-ink-2">{o.description}</p>}</Card>
        <div className="space-y-6">
          <Card className="p-6"><CardTitle title="مدير الحساب" />{can(u, 'orgs.manage') ? <ActionForm action={saveOrgAdmin} className="mt-4 flex gap-2"><input type="hidden" name="id" value={o.id} /><select name="accountManagerId" defaultValue={o.accountManagerId ?? ''} className="input flex-1"><option value="">—</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><Submit>حفظ</Submit></ActionForm> : <p className="mt-3 text-sm">{managers.find(m => m.id === o.accountManagerId)?.name ?? '—'}</p>}</Card>
          <Card className="p-6"><CardTitle title="مستخدمو الجهة" /><ul className="mt-4 space-y-2 text-sm">{members.map(m => <li key={m.id} className="flex items-center justify-between rounded-xl bg-forest-50 p-3"><div><div className="font-semibold">{m.name}</div><div className="ltr text-right text-xs text-muted">{m.email} · {m.phone}</div></div>{!m.active && <Badge tone="rose">معطل</Badge>}</li>)}</ul></Card>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6"><CardTitle title="الطلبات" /><ul className="mt-4 space-y-2">{as.map(a => <li key={a.id}><Link href={`/admin/assessments/${a.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:border-forest-500"><span><span className="ltr font-mono text-xs">{a.number}</span> · {a.cycleYear}</span><StatusBadge status={a.status} /></Link></li>)}</ul></Card>
        <Card className="p-6"><CardTitle title="المدفوعات" /><ul className="mt-4 divide-y divide-line text-sm">{pays.map(p => <li key={p.id} className="flex items-center justify-between py-2"><span>{PRODUCT_LABEL[p.product]}<span className="block text-xs text-muted">{fmtDate(p.createdAt)}</span></span><span className="text-left"><b className="num">{fmtSAR(p.total)}</b><span className="block"><Badge tone={PAYMENT_STATUS_LABEL[p.status].tone}>{PAYMENT_STATUS_LABEL[p.status].label}</Badge></span></span></li>)}</ul></Card>
        <Card className="p-6"><CardTitle title="الشهادات" /><ul className="mt-4 space-y-2 text-sm">{certs.map(c => <li key={c.id}><Link href={`/print/certificate/${c.id}`} target="_blank" className="flex items-center justify-between rounded-xl bg-forest-50 p-3"><span className="ltr font-mono text-xs">{c.number}</span><span className="flex items-center gap-2"><b className="num">{c.score}</b><LevelBadge level={c.level} /></span></Link></li>)}</ul></Card>
      </div>
    </div>
  );
}
