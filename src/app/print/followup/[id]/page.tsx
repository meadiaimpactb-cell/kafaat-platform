import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, visits, assessments, organizations, users } from '@/db';
import { requireOwnerOrStaff } from '@/lib/print-access';
import { PrintBar } from '@/components/client/print-bar';
import { fmtDate, fmtSAR } from '@/lib/format';

export const metadata = { title: 'التقرير التعقيبي' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const v = (await db.select().from(visits).where(eq(visits.id, id)).limit(1))[0]; if (!v) notFound();
  const a = (await db.select().from(assessments).where(eq(assessments.id, v.assessmentId)).limit(1))[0]; if (!a) notFound();
  const u = await requireOwnerOrStaff(a.orgId, 'visits.manage');
  // الجهة لا ترى إلا التقرير المنشور
  if (u.role === 'ORG_USER' && v.followupStatus !== 'PUBLISHED') notFound();
  if (!v.followup) notFound();
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const verifier = v.consultantId ? (await db.select({ n: users.name }).from(users).where(eq(users.id, v.consultantId)).limit(1))[0]?.n : null;
  const showName = u.role !== 'ORG_USER' || a.revealVerifier;
  const f = v.followup; const draft = v.followupStatus !== 'PUBLISHED';
  const Block = ({ t, list }: { t: string; list: string[] }) => list.length ? <div><h2 className="mb-[2mm] font-display text-[13pt] font-bold">{t}</h2><ol className="list-inside list-decimal space-y-[1.5mm]">{list.map((x, i) => <li key={i}>{x}</li>)}</ol></div> : null;
  return (
    <>
      <PrintBar back={u.role === 'ORG_USER' ? `/portal/assessments/${a.id}/verification` : `/admin/assessments/${a.id}`} title={`التقرير التعقيبي ${a.number}`} />
      <style>{`@page { size: A4; margin: 12mm 0 }`}</style>
      <div className="flex justify-center p-6 print:p-0">
        <div className="w-[210mm] space-y-[7mm] bg-white px-[15mm] py-[14mm] text-[10.5pt] leading-[6.5mm] shadow-2xl print:shadow-none" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div className="flex items-center justify-between border-b-4 border-forest-950 pb-[4mm]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="" className="h-[13mm]" />
            <div className="text-left"><div className="font-display text-[16pt] font-black">التقرير التعقيبي</div><div className="text-muted">نتيجة زيارة التحقق الميداني{draft ? ' · مسودة غير منشورة' : ''}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-x-[8mm] gap-y-[2mm] rounded-[3mm] bg-forest-50 p-[5mm] text-[9.5pt]">
            <div><span className="text-muted">الجهة: </span><b>{org.name}</b></div><div><span className="text-muted">رقم الطلب: </span><b className="ltr">{a.number}</b></div>
            <div><span className="text-muted">السنة المالية: </span><b>{a.cycleYear}</b></div><div><span className="text-muted">المصروفات: </span><b>{fmtSAR(a.expenses)}</b></div>
            <div><span className="text-muted">تاريخ الزيارة: </span><b>{v.scheduledAt ? fmtDate(v.scheduledAt) : '—'}</b></div><div><span className="text-muted">المقر: </span><b>{v.location ?? org.address ?? org.city ?? '—'}</b></div>
            {v.sampleResult && <div className="col-span-2"><span className="text-muted">عينة التتبع: </span><b className="num">{v.sampleResult.matched} مطابقة من {v.sampleResult.checked} حالة</b>{v.sampleResult.notes ? ` — ${v.sampleResult.notes}` : ''}</div>}
          </div>
          <div><h2 className="mb-[2mm] font-display text-[13pt] font-bold">الملخص</h2><p className="whitespace-pre-wrap">{f.summary}</p></div>
          <Block t="نقاط القوة" list={f.strengths} />
          <Block t="الملاحظات" list={f.findings} />
          <Block t="التوصيات" list={f.recommendations} />
          <div className="grid grid-cols-2 gap-[10mm] pt-[8mm] text-center text-[9.5pt]">
            <div className="border-t border-ink/40 pt-[2mm]">خبير التحقق المعتمد{showName && verifier ? <div className="font-bold">{verifier}</div> : null}</div>
            <div className="border-t border-ink/40 pt-[2mm]">كفاءة الأثر — استديو صناع الأثر<div className="text-muted">{v.followupPublishedAt ? `صدر في ${fmtDate(v.followupPublishedAt)}` : 'مسودة'}</div></div>
          </div>
          <p className="text-[8pt] leading-[5mm] text-muted">يعكس هذا التقرير ما أُطلع عليه الخبير في تاريخ الزيارة، ويُقرأ مع تقرير النتيجة والشهادة الموثقة. التوصيات استرشادية لتطوير كفاءة الأثر ولا تغيّر نتيجة التقييم المعتمدة.</p>
        </div>
      </div>
    </>
  );
}
