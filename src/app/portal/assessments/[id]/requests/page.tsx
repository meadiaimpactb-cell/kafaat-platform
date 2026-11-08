import { desc, eq } from 'drizzle-orm';
import { MessageSquareText, CheckCircle2 } from 'lucide-react';
import { db, infoRequests, factors, users } from '@/db';
import { loadOwn } from '@/lib/portal';
import { Card, Empty, ButtonLink } from '@/components/ui';
import { RespondForm } from '@/components/portal/respond-form';
import { fmtRel } from '@/lib/format';

export const metadata = { title: 'الاستيضاحات' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await loadOwn(id);
  const rs = await db.select({ r: infoRequests, fname: factors.name, by: users.name }).from(infoRequests).leftJoin(factors, eq(factors.id, infoRequests.factorId)).leftJoin(users, eq(users.id, infoRequests.createdById)).where(eq(infoRequests.assessmentId, id)).orderBy(desc(infoRequests.createdAt));
  const sorted = [...rs.filter(x => x.r.status === 'OPEN'), ...rs.filter(x => x.r.status !== 'OPEN')];
  if (!rs.length) return <Empty icon={<MessageSquareText className="size-6" />} title="لا توجد استيضاحات" text="إذا احتاج المقيّم معلومة أو دليلاً إضافياً سيظهر طلبه هنا، وستصلك رسالة." />;
  return (
    <div className="space-y-4">
      {sorted.map(({ r, fname, by }) => (
        <Card key={r.id} className={r.status === 'OPEN' ? 'ring-2 ring-orange-brand/40' : ''}>
          <div className="flex flex-wrap items-start gap-4 p-5 md:p-6">
            <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${r.status === 'OPEN' ? 'bg-orange-50 text-orange-brand' : 'bg-forest-100 text-forest-700'}`}>{r.status === 'OPEN' ? <MessageSquareText className="size-5" /> : <CheckCircle2 className="size-5" />}</div>
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">{r.factorId && <span className="ltr rounded bg-forest-50 px-1.5 text-xs font-semibold text-forest-700">{r.factorId}</span>}<span className="font-semibold">{fname ?? 'استيضاح عام'}</span><span className="text-muted">· {by ?? 'المقيّم'} · {fmtRel(r.createdAt)}</span></div>
              <p className="rounded-2xl rounded-tr-sm bg-forest-50 p-4 leading-7">{r.message}</p>
              {r.response ? <div className="ms-8 rounded-2xl rounded-tl-sm bg-white p-4 leading-7 ring-1 ring-line"><div className="mb-1 text-xs text-muted">ردكم · {fmtRel(r.answeredAt)}</div>{r.response}</div>
                : <><RespondForm id={r.id} /><div className="text-xs text-muted">تحتاج إرفاق دليل؟ <ButtonLink href={`/portal/assessments/${id}/documents`} variant="ghost" size="sm">ارفع الملف في صفحة الملفات</ButtonLink> ثم اذكر اسمه في ردك.</div></>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
