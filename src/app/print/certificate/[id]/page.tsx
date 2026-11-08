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
const GOLD = '#B8912E', GOLD2 = '#E6C877';
const PATTERN = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><path d='M60 6l13 28 30 4-22 21 6 30-27-15-27 15 6-30L17 38l30-4z' fill='none' stroke='%230B5233' stroke-width='1.6'/><circle cx='60' cy='60' r='55' fill='none' stroke='%230B5233' stroke-width='.8'/></svg>\")";

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
  const below = qualified && c.level === 'ناشئ';
  const lvl = CERT_SCALE.find(s => s.key === c.level);
  const col = !qualified ? '#E85A0A' : below ? '#9A4A12' : lvl?.color ?? '#0B5233';
  const axes = [{ t: 'كفاءة الموارد', v: snap.axes?.['1'], m: 30 }, { t: 'جودة القياس والأدلة', v: snap.axes?.['2'], m: 30 }, { t: 'الأثر لكل وحدة إنفاق', v: snap.a3adj, m: 30 }, { t: 'المساءلة', v: snap.axes?.['4'], m: 10 }];
  return (
    <>
      <PrintBar back={u.role === 'ORG_USER' ? '/portal/certificates' : '/admin/certificates'} title={`${verified ? 'الشهادة' : 'الإفادة'} ${c.number}`} />
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { .sheet { box-shadow: none !important; margin: 0 !important } }`}</style>
      <div className="flex justify-center p-6 print:p-0">
        <div className="sheet relative h-[210mm] w-[297mm] overflow-hidden bg-[#FBFBF7] font-sans shadow-2xl" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div className="absolute inset-0 opacity-[.025]" style={{ backgroundImage: PATTERN, backgroundSize: '120px 120px' }} />
          <div className="absolute inset-[4mm] rounded-[1mm] border-[0.5mm]" style={{ borderColor: GOLD }} />
          <div className="absolute inset-[5.5mm] rounded-[0.8mm] border-[0.25mm]" style={{ borderColor: GOLD2 }} />
          {/* الشريط الجانبي المتدرج */}
          <div className="absolute inset-y-[4mm] right-[4mm] w-[3.5mm]" style={{ background: 'linear-gradient(180deg,#0B5233 0%,#2F7A3A 30%,#7DB33A 52%,#E8B004 74%,#E85A0A 100%)' }} />
          {/* الرأس */}
          <div className="absolute left-[4mm] right-[7.5mm] top-[4mm] h-[34mm] bg-[#062E1C]" style={{ backgroundImage: 'radial-gradient(ellipse at 85% 20%, rgba(196,212,42,.22), transparent 55%), radial-gradient(ellipse at 10% 90%, rgba(255,255,255,.08), transparent 50%)' }}>
            <div className="absolute inset-x-0 bottom-0 h-[1.2mm]" style={{ background: `linear-gradient(90deg, ${GOLD2}, ${GOLD}, ${GOLD2})` }} />
            <div className="flex h-full items-start justify-between px-[12mm] pt-[6mm]">
              <div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-dark.png" alt="" className="h-[15mm] w-auto" />
                <div className="mt-[2.5mm] text-[9.5pt] text-[#CFE3D3]">منهجية شهادة كفاءة الأثر للجهات غير الربحية</div>
              </div>
              <div className="text-left text-white">
                <div className="text-[8pt] tracking-wider" style={{ color: GOLD2 }}>رقم الوثيقة</div>
                <div className="ltr font-mono text-[12pt] font-bold">{c.number}</div>
                <div className="mt-[2.5mm] inline-block rounded-full border-[0.35mm] px-[4mm] py-[1.2mm] text-[8.5pt] font-bold" style={{ borderColor: GOLD2, color: GOLD2 }}>{verified ? 'شهادة موثقة بزيارة تحقق ميدانية' : 'إفادة نتيجة غير موثقة · مراجعة مكتبية'}</div>
              </div>
            </div>
          </div>
          {!verified && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="-rotate-[18deg] font-display text-[64pt] font-black tracking-wider text-amber-500/[.09]">غير موثقة</div></div>}
          {c.status !== 'ACTIVE' && <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="rotate-[-12deg] rounded-3xl border-[6px] border-rose-600/60 px-10 py-3 font-display text-[44pt] font-black text-rose-600/60">ملغاة</div></div>}

          {/* المتن */}
          <div className="absolute inset-x-[12mm] bottom-[8mm] top-[42mm] grid grid-cols-[1fr_118mm] gap-[10mm]">
            {/* يمين: النص */}
            <div className="flex flex-col">
              <h1 className="font-display text-[30pt] font-black leading-none text-forest-950">{verified ? 'شهادة كفاءة الأثر' : 'إفادة تقييم كفاءة الأثر'}</h1>
              <div className="mt-[3mm] text-[10.5pt] text-ink-2">{verified ? 'تشهد منصة كفاءة الأثر بأن' : 'صدرت نتيجة التقييم لـ'}</div>
              <div className="mt-[1mm] font-display text-[23pt] font-bold leading-tight text-ink">{snap.orgName}</div>
              <div className="mt-[2mm] h-[0.8mm] w-[36mm]" style={{ background: GOLD }} />
              <div className="mt-[2mm] text-[9.5pt] text-muted">{[snap.orgCity, snap.field, `المسار ${TRACK_LABEL[snap.track]}`].filter(Boolean).join(' · ')}</div>
              <p className="mt-[5mm] text-[12pt] leading-[8.5mm] text-ink-2">
                {qualified && !below ? <>قد حققت مستوى <b className="rounded-[1.5mm] px-[2mm] text-white" style={{ background: col }}>{c.level}</b> في تقييم كفاءة الأثر</> : below ? <>قد اجتازت البوابات الأساسية في تقييم كفاءة الأثر ودرجتها دون حد المستوى الأول</> : <>قد خضعت لتقييم كفاءة الأثر وهي <b>قيد التأهيل</b> لعدم استيفاء البوابات الأساسية</>} عن السنة المالية <b className="num">{c.periodYear}</b>، بدرجة <b className="num">{c.score.toFixed(1)}</b> من 100، وفق منهج يقيس قدرة الجهة على تحويل مواردها إلى أثر حقيقي موثق عبر 56 عاملاً{verified ? '، وتحقق مستشار المنصة ميدانياً من أدلته بعينة تتبع.' : '، بمراجعة مكتبية من مقيّم معتمد للأدلة المرفوعة، دون زيارة تحقق ميدانية.'}
              </p>
              <div className="mt-[7mm] grid grid-cols-4 gap-[3mm]">
                {axes.map(x => (
                  <div key={x.t} className="rounded-[2.5mm] border border-line bg-white p-[2.5mm]"><div className="text-[7.5pt] leading-[4mm] text-muted">{x.t}</div><div className="font-display text-[14pt] font-bold num">{(x.v ?? 0).toFixed(1)}<span className="text-[7.5pt] font-normal text-muted"> / {x.m}</span></div><div className="mt-[1.2mm] h-[1.4mm] overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full" style={{ width: `${((x.v ?? 0) / x.m) * 100}%`, background: 'linear-gradient(270deg,#0B5233,#7DB33A)' }} /></div></div>
                ))}
              </div>
              <div className="mt-auto flex items-end justify-between gap-[6mm] pt-[4mm]">
                <div className="flex gap-[10mm] text-center text-[8.5pt]">
                  <div><div className="mb-[1mm] h-[9mm] w-[40mm] border-b border-ink/40" /><div className="text-muted">{verified ? 'مستشار التحقق الميداني' : 'المقيّم المعتمد'}</div></div>
                  <div><div className="mb-[1mm] h-[9mm] w-[40mm] border-b border-ink/40" /><div className="text-muted">مدير برنامج كفاءة الأثر</div></div>
                </div>
                <div className="relative grid size-[26mm] place-items-center rounded-full text-center font-display text-[9pt] font-black leading-tight text-[#3A2A08]" style={{ background: `radial-gradient(circle at 35% 30%, ${GOLD2}, ${GOLD} 60%, #8E6D1E)` }}>
                  <div className="absolute inset-[1.6mm] rounded-full border border-dashed border-[#3A2A08]/60" />
                  <div>{verified ? 'موثقة' : 'غير موثقة'}<div className="text-[6.5pt] font-semibold">{verified ? 'تحقق ميداني' : 'مراجعة مكتبية'}</div></div>
                </div>
              </div>
            </div>
            {/* يسار: بطاقة الكفاءة */}
            <div className="flex flex-col">
              <div className="rounded-[4mm] border border-line bg-white p-[5mm] shadow-[0_6mm_14mm_-10mm_rgba(6,46,28,.4)]">
                <div className="mb-[2.5mm] flex justify-between text-[7.5pt] text-muted"><span>مستويات شهادة كفاءة الأثر</span><span>الدرجة من 100</span></div>
                <div className="grid grid-cols-[1fr_38mm] gap-[4mm]">
                  <div className="space-y-[2.6mm]">
                    {CERT_SCALE.map((s, i) => { const on = qualified && s.key === c.level; return (
                      <div key={s.key} className="flex items-center gap-[1.5mm]">
                        <div className="flex h-[9.2mm] items-center justify-between px-[3mm] text-[9pt] font-extrabold text-white" style={{ width: `${46 + i * 11}%`, background: s.color, clipPath: 'polygon(0 0, calc(100% - 3mm) 0, 100% 50%, calc(100% - 3mm) 100%, 0 100%)', borderRadius: '1mm 0 0 1mm' }}><span>{s.key}</span><span className="ltr me-[2.5mm] text-[7pt] font-medium opacity-90">{s.min ? `${s.min}+` : '< 40'}</span></div>
                        {on && <div className="flex h-[9.2mm] flex-1 items-center justify-end gap-[2mm] pe-[3mm] ps-[4mm] font-display text-[10pt] font-black text-white" style={{ background: below ? '#9A4A12' : '#1E2A23', clipPath: 'polygon(3mm 0, 100% 0, 100% 100%, 3mm 100%, 0 50%)' }}><span className="text-[6.5pt] font-medium opacity-80">{below ? 'دون حد المستوى الأول' : 'المستوى المحقق'}</span>{s.key}</div>}
                      </div>); })}
                    {!qualified && <div className="mt-[2mm] flex h-[9.2mm] w-[60%] items-center justify-end gap-[2mm] pe-[3mm] font-display text-[10pt] font-black text-white" style={{ background: '#E85A0A', clipPath: 'polygon(3mm 0, 100% 0, 100% 100%, 3mm 100%, 0 50%)' }}><span className="text-[6.5pt] font-medium opacity-80">الحالة</span>قيد التأهيل</div>}
                  </div>
                  <div className="flex flex-col items-center justify-center border-s border-line ps-[4mm]">
                    <div className="grid size-[36mm] place-items-center rounded-full text-white shadow-[inset_0_0_0_2mm_rgba(255,255,255,.22)]" style={{ background: col }}><div className="text-center leading-none"><div className="font-display text-[26pt] font-black">{c.score.toFixed(1)}</div><div className="mt-[1mm] text-[6.5pt] opacity-90">{qualified ? 'من 100' : 'درجة تطويرية'}</div></div></div>
                    <div className="mt-[2.5mm] text-center font-display text-[10.5pt] font-extrabold" style={{ color: col }}>{qualified ? (below ? 'دون المستوى الأول' : `المستوى: ${c.level}`) : 'قيد التأهيل'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-[4mm] flex items-center gap-[4mm] rounded-[3mm] bg-forest-50 p-[3mm]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR" className="size-[26mm] rounded-[1.5mm] bg-white p-[1.2mm]" />
                <div className="min-w-0 flex-1 text-[8pt] leading-[4.6mm] text-ink-2">
                  <div className="font-bold text-ink">تحقق من الشهادة</div>
                  <div>امسح الرمز أو أدخل رمز التحقق في صفحة التحقق العامة</div>
                  <div className="ltr truncate text-right font-mono text-[9pt] font-bold tracking-widest text-forest-800">{c.verifyCode}</div>
                  <div className="ltr truncate text-right text-[7pt] text-muted">{url}</div>
                </div>
              </div>
              <div className="mt-[3mm] grid grid-cols-2 gap-x-[6mm] gap-y-[1mm] text-[8pt]"><span className="text-muted">تاريخ الإصدار</span><span className="text-muted">سارية حتى</span><b>{fmtDate(c.issuedAt)}</b><b>{fmtDate(c.validUntil)}</b></div>
              <div className="mt-auto flex items-center justify-between text-[7pt] text-muted">
                <span>منهجية كفاءة الأثر · تأليف م. إلياس عبد الكريم</span>
                <span className="flex items-center gap-[2mm]">إحدى مبادرات استديو صناع الأثر
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/studio.png" alt="" className="h-[7mm]" /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
