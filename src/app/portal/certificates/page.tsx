import { desc, eq } from 'drizzle-orm';
import { Award, ExternalLink, Printer } from 'lucide-react';
import { db, certificates } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card, EfficiencyLabel, ButtonLink, Empty, Badge } from '@/components/ui';
import { fmtDate, fmtNum } from '@/lib/format';

export const metadata = { title: 'الشهادات' };
export default async function Page() {
  const u = await requireUser(['ORG_USER']);
  const rows = await db.select().from(certificates).where(eq(certificates.orgId, u.orgId!)).orderBy(desc(certificates.issuedAt));
  return (
    <div>
      <PageHeader title="الشهادات والإفادات" subtitle="الإفادة غير الموثقة تصدر بعد المراجعة المكتبية، والشهادة الموثقة بعد زيارة التحقق. كلاهما يغطي السنة المالية الماضية ويسري حتى نهاية السنة الحالية." />
      {rows.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {rows.map(c => { const expired = c.validUntil < new Date(); const verified = c.type === 'VERIFIED'; return (
            <Card key={c.id} className={`overflow-hidden ${c.status !== 'ACTIVE' ? 'opacity-60' : ''}`}>
              <div className={`flex items-center justify-between p-5 ${verified ? 'bg-forest-950 text-white' : 'bg-amber-50'}`}>
                <div><div className={`text-xs ${verified ? 'text-lime-brand' : 'text-amber-800'}`}>{verified ? 'شهادة كفاءة الأثر الموثقة' : 'إفادة نتيجة غير موثقة'}</div><div className="ltr text-right font-mono text-sm">{c.number}</div></div>
                <div className="flex gap-2">{c.status !== 'ACTIVE' ? <Badge tone="rose">{c.status === 'REVOKED' ? 'ملغاة' : 'منتهية'}</Badge> : expired ? <Badge tone="slate">منتهية</Badge> : <Badge tone="green" dot>سارية</Badge>}</div>
              </div>
              <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
                <EfficiencyLabel level={c.level} score={c.score} compact qualified={c.level !== 'قيد التأهيل'} />
                <div className="space-y-3 text-sm sm:w-44">
                  <div><div className="text-xs text-muted">الدرجة</div><div className="font-display text-3xl font-black num">{fmtNum(c.score, 1)}</div></div>
                  <div><div className="text-xs text-muted">الفترة</div><div className="font-semibold">السنة المالية {c.periodYear}</div></div>
                  <div><div className="text-xs text-muted">سارية حتى</div><div className="font-semibold">{fmtDate(c.validUntil)}</div></div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t border-line p-4">
                <ButtonLink href={`/print/certificate/${c.id}`} target="_blank" size="sm"><Printer className="size-4" /> عرض وطباعة</ButtonLink>
                <ButtonLink href={`/verify/${c.verifyCode}`} target="_blank" variant="outline" size="sm"><ExternalLink className="size-4" /> صفحة التحقق العامة</ButtonLink>
              </div>
            </Card>
          ); })}
        </div>
      ) : <Empty icon={<Award className="size-6" />} title="لا شهادات بعد" text="تصدر الإفادة بعد اعتماد المقيّم للتقييم المكتبي." />}
    </div>
  );
}
