import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db, assessments, organizations, factors } from '@/db';
import { requireOwnerOrStaff } from '@/lib/print-access';
import { PrintBar } from '@/components/client/print-bar';
import { EfficiencyLabel, LevelChip } from '@/components/ui';
import { AXES, type ScoreSnapshot } from '@/lib/scoring';
import { SECTIONS, TRACK_LABEL } from '@/lib/domain';
import { fmtDate, fmtNum, fmtSAR } from '@/lib/format';

export const metadata = { title: 'تقرير النتيجة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = (await db.select().from(assessments).where(eq(assessments.id, id)).limit(1))[0]; if (!a) notFound();
  const u = await requireOwnerOrStaff(a.orgId, 'assessments.view');
  const snap = (a.finalResult ?? a.deskResult) as unknown as ScoreSnapshot | null; if (!snap) notFound();
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const fs = await db.select().from(factors).orderBy(asc(factors.sortOrder));
  const nm = Object.fromEntries(fs.map(f => [f.id, f.name]));
  const verified = !!a.finalResult;
  return (
    <>
      <PrintBar back={u.role === 'ORG_USER' ? `/portal/assessments/${id}/result` : `/admin/assessments/${id}`} title={`تقرير ${a.number}`} />
      <style>{`@page { size: A4; margin: 12mm 0 }`}</style>
      <div className="flex justify-center p-6 print:p-0">
        <div className="w-[210mm] space-y-[7mm] bg-white px-[15mm] py-[14mm] text-[10pt] leading-[6mm] shadow-2xl print:shadow-none" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div className="flex items-center justify-between border-b-4 border-forest-950 pb-[4mm]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="" className="h-[13mm]" />
            <div className="text-left"><div className="font-display text-[16pt] font-black">تقرير نتيجة كفاءة الأثر</div><div className="text-muted">{verified ? 'نتيجة موثقة بزيارة تحقق' : 'نتيجة غير موثقة · مراجعة مكتبية'}</div></div>
          </div>
          <div className="grid grid-cols-[1fr_70mm] gap-[8mm]">
            <div>
              <div className="font-display text-[18pt] font-bold">{org.name}</div>
              <div className="text-muted">{org.city} · {org.field} · المسار {TRACK_LABEL[snap.track]} · المصروفات {fmtSAR(a.expenses)}</div>
              <div className="mt-[3mm] text-muted">رقم الطلب <span className="ltr">{a.number}</span> · السنة المالية {a.cycleYear} · {verified ? `اعتُمد ${fmtDate(a.certifiedAt)}` : `اعتُمد ${fmtDate(a.deskCompletedAt)}`}</div>
              <div className="mt-[6mm] flex items-end gap-[3mm]"><span className="font-display text-[40pt] font-black leading-none num">{fmtNum(snap.total, 1)}</span><span className="mb-[2mm] text-muted">/ 100 · {snap.status === 'مؤهل' ? `المستوى «${snap.level}»` : 'قيد التأهيل'}</span></div>
              {a.assessorSummary && <p className="mt-[5mm] rounded-[3mm] bg-forest-50 p-[4mm]">{a.assessorSummary}</p>}
            </div>
            <EfficiencyLabel level={snap.level} score={snap.total} compact qualified={snap.status === 'مؤهل'} />
          </div>
          <div>
            <h2 className="mb-[3mm] font-display text-[13pt] font-bold">مكونات الدرجة</h2>
            <table className="w-full border-collapse"><tbody>{Object.entries(AXES).map(([k, ax]) => { const v = k === '3' ? snap.a3adj : snap.axes[k]; return <tr key={k} className="border-b border-line"><td className="py-[2mm]">{ax.name}</td><td className="w-[60mm] py-[2mm]"><div className="h-[2.5mm] overflow-hidden rounded-full bg-forest-100"><div className="h-full bg-forest-700" style={{ width: `${(v / ax.pts) * 100}%` }} /></div></td><td className="w-[22mm] py-[2mm] text-left num font-bold">{fmtNum(v, 1)} / {ax.pts}</td></tr>; })}</tbody></table>
          </div>
          {(snap.gateFail.length > 0 || snap.caps.length > 0) && <div><h2 className="mb-[2mm] font-display text-[13pt] font-bold">البوابات والسقوف</h2><ul className="list-inside list-disc">{snap.gateFail.map(([f, l, m]) => <li key={f}>بوابة {nm[f]}: {l} والمطلوب {m}</li>)}{snap.trkFail.map(([f, l, m]) => <li key={f}>متطلب المسار {nm[f]}: {l} والمطلوب {m}</li>)}{snap.caps.map(([x, y, w], i) => <li key={i}>سقف من «{x}» إلى «{y}»: {w}</li>)}</ul></div>}
          {(a.recommendations ?? []).length > 0 && <div><h2 className="mb-[2mm] font-display text-[13pt] font-bold">التوصيات</h2><ol className="list-inside list-decimal space-y-[1mm]">{(a.recommendations ?? []).sort((x, y) => x.priority - y.priority).map((r, i) => <li key={i}>{r.text}</li>)}</ol></div>}
          <div style={{ breakBefore: 'page' }}>
            <h2 className="mb-[3mm] font-display text-[13pt] font-bold">مستويات المعايير</h2>
            {SECTIONS.map(s => <div key={s.key} className="mb-[4mm]"><div className="mb-[1.5mm] font-bold text-forest-700">{s.title}</div><div className="grid grid-cols-2 gap-x-[6mm] gap-y-[1mm]">{fs.filter(f => f.section === s.key).map(f => <div key={f.id} className="flex items-center gap-[2mm] border-b border-line/70 py-[0.8mm] text-[8.8pt]"><LevelChip level={snap.levels[f.id]} size="sm" /><span className="flex-1">{f.name}</span><span className="ltr text-[7.5pt] text-muted">{f.id}</span></div>)}</div></div>)}
          </div>
        </div>
      </div>
    </>
  );
}
