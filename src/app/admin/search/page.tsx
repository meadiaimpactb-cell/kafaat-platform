import Link from 'next/link';
import { and, desc, eq, like, or } from 'drizzle-orm';
import { Building2, ClipboardList, MapPin, Search, Users, Award, Wallet } from 'lucide-react';
import { db, organizations, assessments, visits, users, payments, certificates } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Card, Empty, Badge } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { likeOf } from '@/lib/list-query';
import { VERIFICATION_LABEL } from '@/lib/org-meta';
import { VISIT_STATUS_LABEL, ROLE_LABEL } from '@/lib/domain';

export const metadata = { title: 'بحث شامل' };
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await requireStaff(); const sp = await searchParams; const q = (sp.q ?? '').trim();
  const l = likeOf(q);
  const [orgs, as, vs, us, ps, cs] = q.length < 2 ? [[], [], [], [], [], []] as never[][] : await Promise.all([
    can(u, 'orgs.view') || can(u, 'orgs.verify') ? db.select().from(organizations).where(or(like(organizations.name, l), like(organizations.nameEn, l), like(organizations.licenseNo, l), like(organizations.unifiedNo, l), like(organizations.email, l), like(organizations.phone, l), like(organizations.repName, l), like(organizations.repPhone, l))).orderBy(desc(organizations.createdAt)).limit(8) : [],
    can(u, 'assessments.view') ? db.select({ a: assessments, org: organizations.name }).from(assessments).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(or(like(assessments.number, l), like(organizations.name, l))).orderBy(desc(assessments.updatedAt)).limit(8) : [],
    can(u, 'visits.manage') ? db.select({ v: visits, a: assessments.number, org: organizations.name }).from(visits).innerJoin(assessments, eq(assessments.id, visits.assessmentId)).innerJoin(organizations, eq(organizations.id, assessments.orgId)).where(or(like(assessments.number, l), like(organizations.name, l))).limit(6) : [],
    can(u, 'users.manage') ? db.select().from(users).where(and(or(like(users.name, l), like(users.email, l), like(users.phone, l)))).limit(8) : [],
    can(u, 'payments.view') ? db.select({ p: payments, org: organizations.name }).from(payments).innerJoin(organizations, eq(organizations.id, payments.orgId)).where(or(like(payments.number, l), like(organizations.name, l))).orderBy(desc(payments.createdAt)).limit(6) : [],
    can(u, 'certificates.issue') ? db.select({ c: certificates, org: organizations.name }).from(certificates).innerJoin(organizations, eq(organizations.id, certificates.orgId)).where(or(like(certificates.number, l), like(organizations.name, l))).limit(6) : [],
  ]);
  const total = orgs.length + as.length + vs.length + us.length + ps.length + cs.length;
  const Sec = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => <Card className="p-5"><div className="mb-3 flex items-center gap-2 font-display text-base font-bold">{icon}{title}</div><ul className="space-y-1.5 text-sm">{children}</ul></Card>;
  const row = 'flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 hover:border-forest-500';
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="بحث شامل" subtitle="ابحث بالاسم أو الترخيص أو رقم الطلب أو الدفعة أو الشهادة أو الهاتف أو البريد." />
      <form className="relative"><Search className="pointer-events-none absolute right-4 top-1/2 size-5 -translate-y-1/2 text-muted" /><input name="q" defaultValue={q} autoFocus placeholder="اكتب حرفين على الأقل…" className="input h-12 w-full pr-12 text-base" /></form>
      {q.length >= 2 && !total && <Empty title="لا نتائج" text="جرّب كلمة أخرى أو جزءاً من الرقم." />}
      <div className="grid gap-4 lg:grid-cols-2">
        {orgs.length > 0 && <Sec icon={<Building2 className="size-5 text-forest-700" />} title="الجهات">{(orgs as (typeof organizations.$inferSelect)[]).map(o => <li key={o.id}><Link href={`/admin/organizations/${o.id}`} className={row}><span className="font-semibold">{o.name}</span><span className="flex items-center gap-2 text-xs text-muted"><span className="ltr">{o.licenseNo}</span><Badge tone={VERIFICATION_LABEL[o.verificationStatus].tone}>{VERIFICATION_LABEL[o.verificationStatus].label}</Badge></span></Link></li>)}</Sec>}
        {as.length > 0 && <Sec icon={<ClipboardList className="size-5 text-forest-700" />} title="طلبات التقييم">{(as as { a: typeof assessments.$inferSelect; org: string }[]).map(({ a, org }) => <li key={a.id}><Link href={`/admin/assessments/${a.id}`} className={row}><span><b className="ltr font-mono text-xs">{a.number}</b> · {org}</span><StatusBadge status={a.status} /></Link></li>)}</Sec>}
        {vs.length > 0 && <Sec icon={<MapPin className="size-5 text-forest-700" />} title="زيارات التحقق">{(vs as { v: typeof visits.$inferSelect; a: string; org: string }[]).map(({ v, a, org }) => <li key={v.id}><Link href={`/admin/visits?focus=${v.id}`} className={row}><span><b className="ltr font-mono text-xs">{a}</b> · {org}</span><Badge tone={VISIT_STATUS_LABEL[v.status].tone}>{VISIT_STATUS_LABEL[v.status].label}</Badge></Link></li>)}</Sec>}
        {us.length > 0 && <Sec icon={<Users className="size-5 text-forest-700" />} title="المستخدمون">{(us as (typeof users.$inferSelect)[]).map(x => <li key={x.id}><Link href={x.role === 'ORG_USER' ? '/admin/organizations?q=' + encodeURIComponent(x.email) : '/admin/users'} className={row}><span className="font-semibold">{x.name}</span><span className="text-xs text-muted">{ROLE_LABEL[x.role]} · <span className="ltr">{x.email}</span></span></Link></li>)}</Sec>}
        {ps.length > 0 && <Sec icon={<Wallet className="size-5 text-forest-700" />} title="المدفوعات">{(ps as { p: typeof payments.$inferSelect; org: string }[]).map(({ p, org }) => <li key={p.id}><Link href={`/admin/payments?q=${encodeURIComponent(p.number)}`} className={row}><span><b className="ltr font-mono text-xs">{p.number}</b> · {org}</span><span className="num text-xs">{p.total}</span></Link></li>)}</Sec>}
        {cs.length > 0 && <Sec icon={<Award className="size-5 text-forest-700" />} title="الشهادات">{(cs as { c: typeof certificates.$inferSelect; org: string }[]).map(({ c, org }) => <li key={c.id}><Link href={`/print/certificate/${c.id}`} target="_blank" className={row}><span><b className="ltr font-mono text-xs">{c.number}</b> · {org}</span><span className="num text-xs">{c.score}</span></Link></li>)}</Sec>}
      </div>
    </div>
  );
}
