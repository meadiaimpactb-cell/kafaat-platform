import Link from 'next/link';
import { inArray } from 'drizzle-orm';
import { Building2, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { db, orgDocuments } from '@/db';
import { orgReadiness, VERIFICATION_LABEL } from '@/lib/org';
import { switchOrg } from '@/app/actions/org';
import { PageHeader, Card, Badge, ButtonLink, Button } from '@/components/ui';

export const metadata = { title: 'جهاتي' };
export default async function Page() {
  const u = await requireUser(['ORG_USER']);
  const docs = u.orgIds.length ? await db.select({ orgId: orgDocuments.orgId, kind: orgDocuments.kind }).from(orgDocuments).where(inArray(orgDocuments.orgId, u.orgIds)) : [];
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="حساب واحد، جهات متعددة" title="جهاتي" subtitle="تستطيع إدارة أكثر من جهة بحساب واحد دون إنشاء حساب لكل جهة. لكل جهة بياناتها ومستنداتها وطلباتها وشهاداتها المستقلة." actions={<ButtonLink href="/portal/onboarding?new=1" variant="lime"><Plus className="size-4" /> إضافة جهة</ButtonLink>} />
      <div className="grid gap-4">
        {u.orgs.map(o => {
          const r = orgReadiness(o, docs.filter(d => d.orgId === o.id).map(d => d.kind)); const vs = VERIFICATION_LABEL[o.verificationStatus]; const active = o.id === u.orgId;
          return (
            <Card key={o.id} className={`p-5 ${active ? 'ring-2 ring-forest-600' : ''}`}>
              <div className="flex flex-wrap items-center gap-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-forest-950 text-lime-brand"><Building2 className="size-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-bold">{o.name}</span>{active && <Badge tone="green">الجهة النشطة</Badge>}<Badge tone={vs.tone} dot>{vs.label}</Badge></div>
                  <div className="mt-1 text-sm text-muted">{[o.orgType, o.city, o.licenseNo && `ترخيص ${o.licenseNo}`].filter(Boolean).join(' · ')}</div>
                  <div className="mt-3 flex items-center gap-3"><div className="h-1.5 w-40 overflow-hidden rounded-full bg-forest-100"><div className="spectrum-rtl h-full" style={{ width: `${r.percent}%` }} /></div><span className="text-xs text-muted">اكتمال الملف <b className="num text-ink">{r.percent}%</b></span></div>
                </div>
                <div className="flex gap-2">
                  {!active && <form action={switchOrg.bind(null, o.id)}><Button variant="outline">التبديل إليها</Button></form>}
                  <ButtonLink href={`/portal/onboarding?org=${o.id}`} variant={r.complete ? 'outline' : 'primary'}>{r.complete ? 'بيانات الجهة' : 'استكمال الملف'}</ButtonLink>
                </div>
              </div>
            </Card>
          );
        })}
        {!u.orgs.length && <Card className="p-8 text-center text-muted">لم تضف أي جهة بعد. <Link href="/portal/onboarding" className="font-semibold text-forest-800">ابدأ بإضافة جهتك</Link></Card>}
      </div>
    </div>
  );
}
