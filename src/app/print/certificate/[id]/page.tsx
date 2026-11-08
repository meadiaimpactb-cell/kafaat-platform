import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db, certificates } from '@/db';
import { requireOwnerOrStaff } from '@/lib/print-access';
import { PrintBar } from '@/components/client/print-bar';
import { CERT_SCALE, TRACK_LABEL } from '@/lib/domain';
import { fmtDate } from '@/lib/format';
import type { ScoreSnapshot } from '@/lib/scoring';

export const metadata = { title: 'الشهادة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = (await db.select().from(certificates).where(eq(certificates.id, id)).limit(1))[0];
  if (!c) notFound();
  const u = await requireOwnerOrStaff(c.orgId, 'certificates.issue');
  const snap = c.snapshot as unknown as ScoreSnapshot & { orgName: string; orgCity?: string; field?: string; assessmentNumber: string };
  const verified = c.type === 'VERIFIED';
  const url = `${(process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')}/verify/${c.verifyCode}`;
  const qr = await QRCode.toDataURL(url, { margin: 0, width: 220, color: { dark: '#062E1C', light: '#FFFFFF' } });
  const qualified = c.level !== 'قيد التأهيل';
  const lvl = CERT_SCALE.find(s => s.key === c.level);
  return (
    <>
      <PrintBar back={u.role === 'ORG_USER' ? '/portal/certificates' : '/admin/certificates'} title={`${verified ? 'الشهادة' : 'الإفادة'} ${c.number}`} />
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { .sheet { box-shadow: none !important; margin: 0 !important } }`}</style>
      <div className="flex justify-center p-6 print:p-0">
        <div className="sheet relative h-[210mm] w-[297mm] overflow-hidden bg-white shadow-2xl" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div className="absolute inset-0 bg-grid opacity-50" />
          <div className="absolute inset-y-0 right-0 w-[78mm] bg-forest-950" />
          <div className="absolute inset-y-0 right-[78mm] w-[3mm] spectrum" />
          {!verified && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="-rotate-[18deg] font-display text-[64pt] font-black tracking-wider text-amber-500/[.10]">غير موثقة</div></div>}
          {c.status !== 'ACTIVE' && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="rotate-[-12deg] rounded-3xl border-[6px] border-rose-600/60 px-10 py-3 font-display text-[44pt] font-black text-rose-600/60">ملغاة</div></div>}
          {/* الشريط الجانبي */}
          <div className="absolute inset-y-0 right-0 flex w-[78mm] flex-col items-center justify-between px-[9mm] py-[12mm] text-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-dark.png" alt="" className="h-[16mm] w-auto" />
            <div className="w-full space-y-[2.2mm]">
              {CERT_SCALE.map((s, i) => { const on = qualified && s.key === c.level; return (
                <div key={s.key} className="flex items-center gap-[2mm]">
                  <div className="flex h-[8.5mm] items-center justify-between rounded-s-[1.5mm] px-[3mm] text-[10pt] font-bold" style={{ width: `${48 + i * 11}%`, background: s.color, clipPath: 'polygon(0 0, calc(100% - 3mm) 0, 100% 50%, calc(100% - 3mm) 100%, 0 100%)', outline: on ? '0.6mm solid #fff' : 'none', outlineOffset: '0.6mm' }}><span>{s.key}</span><span className="ltr me-[2mm] text-[8pt] opacity-90">{s.min}+</span></div>
                  {on && <div className="rounded-[1.2mm] bg-white px-[2mm] py-[0.6mm] font-display text-[11pt] font-black text-forest-950 num">{c.score.toFixed(1)}</div>}
                </div>); })}
            </div>
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR" className="mx-auto size-[30mm] rounded-[2mm] bg-white p-[2mm]" />
              <div className="mt-[2mm] text-[7.5pt] text-white/60">امسح الرمز للتحقق من الشهادة</div>
              <div className="ltr font-mono text-[9pt] tracking-widest text-lime-brand">{c.verifyCode}</div>
            </div>
          </div>
          {/* المتن */}
          <div className="absolute inset-y-0 left-0 right-[81mm] flex flex-col px-[16mm] py-[14mm]">
            <div className="flex items-start justify-between">
              <div><div className="text-[10pt] font-semibold tracking-wide" style={{ color: verified ? '#0B5233' : '#B88A00' }}>{verified ? 'شهادة موثقة بزيارة تحقق ميدانية' : 'إفادة نتيجة غير موثقة · مراجعة مكتبية'}</div><h1 className="mt-[2mm] font-display text-[30pt] font-black leading-tight text-forest-950">{verified ? 'شهادة كفاءة الأثر' : 'إفادة تقييم كفاءة الأثر'}</h1></div>
              <div className="text-left text-[8.5pt] leading-[5mm] text-muted"><div>رقم {verified ? 'الشهادة' : 'الإفادة'}</div><div className="ltr font-mono text-[10pt] font-bold text-ink">{c.number}</div></div>
            </div>
            <div className="mt-[10mm] text-[12pt] text-ink-2">تشهد منصة كفاءة الأثر بأن</div>
            <div className="mt-[2mm] font-display text-[26pt] font-bold leading-tight text-forest-900">{snap.orgName}</div>
            <div className="text-[10pt] text-muted">{[snap.orgCity, snap.field, `المسار ${TRACK_LABEL[snap.track]}`].filter(Boolean).join(' · ')}</div>
            <p className="mt-[7mm] max-w-[150mm] text-[12pt] leading-[8.5mm] text-ink-2">
              {qualified ? <>قد حققت مستوى <b className="rounded-[1.5mm] px-[2mm] text-white" style={{ background: lvl?.color }}>{c.level}</b> في تقييم كفاءة الأثر</> : <>قد خضعت لتقييم كفاءة الأثر وهي <b>قيد التأهيل</b> لعدم استيفاء البوابات الأساسية</>} عن السنة المالية <b className="num">{c.periodYear}</b>، بدرجة <b className="num">{c.score.toFixed(1)}</b> من 100، وفق منهج يقيس الأثر الصافي الموثق لكل وحدة مورد عبر 56 عاملاً{verified ? '، وتحقق مستشار المنصة ميدانياً من أدلته بعينة تتبع.' : '، بمراجعة مكتبية من مقيّم معتمد للأدلة المرفوعة، دون زيارة تحقق ميدانية.'}
            </p>
            <div className="mt-[8mm] grid grid-cols-4 gap-[4mm]">
              {[{ t: 'كفاءة الموارد', v: snap.axes?.['1'], m: 30 }, { t: 'جودة القياس والأدلة', v: snap.axes?.['2'], m: 30 }, { t: 'الأثر لكل وحدة إنفاق', v: snap.a3adj, m: 30 }, { t: 'المساءلة', v: snap.axes?.['4'], m: 10 }].map(x => (
                <div key={x.t} className="rounded-[3mm] border border-line p-[3mm]"><div className="text-[8pt] text-muted">{x.t}</div><div className="font-display text-[15pt] font-bold num">{(x.v ?? 0).toFixed(1)}<span className="text-[8pt] font-normal text-muted"> / {x.m}</span></div><div className="mt-[1.5mm] h-[1.4mm] overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full bg-forest-700" style={{ width: `${((x.v ?? 0) / x.m) * 100}%` }} /></div></div>
              ))}
            </div>
            <div className="mt-auto flex items-end justify-between gap-6 pt-[6mm]">
              <div className="grid grid-cols-2 gap-x-[10mm] gap-y-[1mm] text-[9.5pt]"><span className="text-muted">تاريخ الإصدار</span><span className="text-muted">سارية حتى</span><b>{fmtDate(c.issuedAt)}</b><b>{fmtDate(c.validUntil)}</b></div>
              <div className="flex gap-[12mm] text-center text-[9pt]">
                <div><div className="mb-[1mm] h-[10mm] w-[42mm] border-b border-ink/30" /><div className="text-muted">{verified ? 'مستشار التحقق الميداني' : 'المقيّم المعتمد'}</div></div>
                <div><div className="mb-[1mm] h-[10mm] w-[42mm] border-b border-ink/30" /><div className="text-muted">مدير برنامج كفاءة الأثر</div></div>
              </div>
            </div>
            <div className="mt-[4mm] text-[7.5pt] leading-[4mm] text-muted">تغطي {verified ? 'الشهادة' : 'الإفادة'} أداء السنة المالية المذكورة بتقريرها السنوي وقوائمها المالية، وتسري حتى التاريخ المبين. تحقق من صلاحيتها عبر الرمز أو الرابط: <span className="ltr">{url}</span></div>
          </div>
        </div>
      </div>
    </>
  );
}
