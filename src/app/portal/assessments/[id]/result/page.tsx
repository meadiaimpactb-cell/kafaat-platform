import { and, desc, eq } from 'drizzle-orm';
import { AlertTriangle, BadgeCheck, Download, FileBadge, Gauge, Lightbulb, ShieldAlert, ShieldCheck, Sparkles } from 'lucide-react';
import { db, factors, certificates, users } from '@/db';
import { loadOwn } from '@/lib/portal';
import { evaluate, AXES, type ScoreSnapshot } from '@/lib/scoring';
import { Card, CardTitle, EfficiencyLabel, ButtonLink, LevelChip, Empty } from '@/components/ui';
import { CERT_SCALE, SECTIONS, TRACK_LABEL } from '@/lib/domain';
import { fmtDate, fmtNum } from '@/lib/format';

export const metadata = { title: 'نتيجة التقييم' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { a, hasResult } = await loadOwn(id);
  const snap = (a.finalResult ?? a.deskResult) as unknown as ScoreSnapshot | null;
  if (!hasResult || !snap) return <Empty icon={<Gauge className="size-6" />} title="النتيجة لم تصدر بعد" text="تظهر النتيجة هنا بعد أن يعتمد المقيّم التقييم المكتبي." />;
  const verified = a.status === 'CERTIFIED' && !!a.finalResult;
  const r = evaluate(snap.levels, Number(a.expenses ?? 0));
  const fs = await db.select().from(factors);
  const F = Object.fromEntries(fs.map(f => [f.id, f]));
  const cert = (await db.select().from(certificates).where(and(eq(certificates.assessmentId, id), eq(certificates.status, 'ACTIVE'))).orderBy(desc(certificates.issuedAt)))[0];
  const assessor = a.assessorId ? (await db.select({ n: users.name }).from(users).where(eq(users.id, a.assessorId)))[0]?.n : null;
  const qualified = snap.status === 'مؤهل';
  const lvl = CERT_SCALE.find(s => s.key === snap.level);
  const recs = a.recommendations ?? [];

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center gap-4 rounded-2xl p-5 ${verified ? 'bg-forest-100 text-forest-900 ring-1 ring-forest-300' : 'bg-amber-50 text-amber-950 ring-1 ring-amber-200'}`}>
        {verified ? <ShieldCheck className="size-7 shrink-0" /> : <ShieldAlert className="size-7 shrink-0" />}
        <div className="flex-1"><div className="font-display font-semibold">{verified ? 'نتيجة موثقة بزيارة تحقق ميدانية' : 'نتيجة غير موثقة'}</div><div className="text-sm opacity-80">{verified ? 'صدرت بعد تحقق المستشار ميدانياً من الأدلة بعينة تتبع.' : `صادرة بمراجعة مكتبية من المقيّم${assessor ? ` (${assessor})` : ''} للأدلة المرفوعة. للحصول على شهادة كفاءة الأثر الموثقة اطلب زيارة التحقق.`}</div></div>
        {!verified && <ButtonLink href={`/portal/assessments/${id}/verification`} variant="primary">طلب زيارة التحقق</ButtonLink>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-7">
          <div className="mb-5 flex items-center justify-between"><div><div className="text-xs font-semibold tracking-wide text-forest-600">بطاقة كفاءة الأثر</div><div className="font-display text-lg font-semibold">السنة المالية {a.cycleYear}</div></div><span className="ltr font-mono text-xs text-muted">{a.number}</span></div>
          <EfficiencyLabel level={snap.level} score={snap.total} qualified={qualified} />
          <div className="mt-6 flex flex-wrap gap-2">
            <ButtonLink href={`/print/report/${id}`} target="_blank" variant="outline" size="sm"><Download className="size-4" /> تقرير النتيجة PDF</ButtonLink>
            {cert && <ButtonLink href={`/print/certificate/${cert.id}`} target="_blank" variant="outline" size="sm"><FileBadge className="size-4" /> {cert.type === 'VERIFIED' ? 'الشهادة الموثقة' : 'إفادة النتيجة غير الموثقة'}</ButtonLink>}
          </div>
        </Card>
        <Card className="relative overflow-hidden p-7">
          <div className="absolute -left-10 -top-10 size-44 rounded-full opacity-15 blur-2xl" style={{ background: lvl?.color }} />
          <div className="relative">
            <div className="text-sm text-muted">الدرجة الكلية</div>
            <div className="flex items-end gap-3"><span className="font-display text-7xl font-black num leading-none" style={{ color: lvl?.color }}>{fmtNum(snap.total, 1)}</span><span className="mb-2 text-muted">/ 100</span></div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full px-3 py-1 text-sm font-bold text-white" style={{ background: qualified ? lvl?.color : '#E85A0A' }}>{qualified ? `المستوى: ${snap.level}` : 'قيد التأهيل'}</span>
              <span className="rounded-full bg-forest-50 px-3 py-1 text-sm">المسار {TRACK_LABEL[snap.track]}</span>
              {snap.baseLevel !== snap.level && <span className="rounded-full bg-amber-50 px-3 py-1 text-sm text-amber-900">المستوى قبل السقوف: {snap.baseLevel}</span>}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[{ t: 'كتلة الكفاءة', v: snap.blocks.efficiency, s: 'من 60' }, { t: 'كتلة الأدلة', v: snap.blocks.evidence, s: 'من 30' }, { t: 'مؤشر نضج المحركات', v: snap.blocks.drivers, s: 'من 100' }, { t: 'الأهلية', v: snap.blocks.eligibility, s: '' }].map(b => (
                <div key={b.t} className="rounded-2xl bg-forest-50 p-4"><div className="text-xs text-muted">{b.t}</div><div className="font-display text-xl font-bold num">{typeof b.v === 'number' ? fmtNum(b.v, 1) : b.v} <span className="text-xs font-normal text-muted">{b.s}</span></div></div>
              ))}
            </div>
            {cert && <div className="mt-5 text-xs text-muted">رقم {cert.type === 'VERIFIED' ? 'الشهادة' : 'الإفادة'} <span className="ltr font-mono">{cert.number}</span> · سارية حتى {fmtDate(cert.validUntil)} · رمز التحقق <span className="ltr font-mono">{cert.verifyCode}</span></div>}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <CardTitle title="المحاور الأربعة" subtitle="كيف تكوّنت الدرجة: كل محور بوزنه، ومحور الأثر بعد معاملَي التصميم والانتقاء" icon={<Gauge className="size-5" />} />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {Object.entries(AXES).map(([k, ax]) => {
            const v = k === '3' ? snap.a3adj : snap.axes[k]; const pct = (v / ax.pts) * 100;
            return (
              <div key={k} className="rounded-2xl border border-line p-5">
                <div className="flex items-baseline justify-between gap-3"><div><div className="text-xs text-muted">المحور {k}</div><div className="font-semibold">{ax.name}</div></div><div className="font-display text-2xl font-bold num">{fmtNum(v, 1)}<span className="text-sm font-normal text-muted"> / {ax.pts}</span></div></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full bg-gradient-to-l from-forest-500 to-forest-800" style={{ width: `${Math.max(2, pct)}%` }} /></div>
                {k === '3' && <div className="mt-2 text-xs text-muted">قبل المعاملات {fmtNum(snap.axes['3'], 1)} × معامل التصميم {fmtNum(snap.Fd, 2)} × معامل الانتقاء {fmtNum(snap.Fs, 2)}</div>}
                <div className="mt-4 flex flex-wrap gap-2">{r.rows.filter(x => String(x.axis) === k).map(x => <span key={x.id} title={F[x.id]?.name} className="inline-flex items-center gap-1.5 rounded-lg bg-forest-50 py-1 pe-2 ps-1 text-xs"><LevelChip level={x.level} size="sm" /><span className="max-w-40 truncate">{F[x.id]?.name}</span><span className="num text-muted">{fmtNum(x.pts, 1)}</span></span>)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {(snap.gateFail.length > 0 || snap.caps.length > 0 || snap.trkFail.length > 0) && (
        <Card className="p-6">
          <CardTitle title="البوابات والسقوف" subtitle="شروط لا تعوّضها الدرجة" icon={<AlertTriangle className="size-5" />} />
          <ul className="mt-4 space-y-2 text-sm">
            {snap.gateFail.map(([f, l, m]) => <li key={f} className="flex gap-3 rounded-xl bg-orange-50 p-3"><span className="ltr font-semibold text-orange-brand">{f}</span><span className="flex-1">بوابة غير مستوفاة: {F[f]?.name} — المستوى الحالي {l} والمطلوب {m} على الأقل. تبقى الجهة «قيد التأهيل» حتى تستوفيها.</span></li>)}
            {snap.trkFail.map(([f, l, m]) => <li key={f} className="flex gap-3 rounded-xl bg-amber-50 p-3"><span className="ltr font-semibold text-amber-800">{f}</span><span className="flex-1">متطلب المسار: {F[f]?.name} — الحالي {l} والمطلوب {m}.</span></li>)}
            {snap.caps.map(([from, to, why], i) => <li key={i} className="rounded-xl bg-slate-50 p-3">سقف المستوى: من «{from}» إلى «{to}» — {why}</li>)}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <CardTitle title="أولويات التطوير" subtitle="أعلى المحركات أثراً في رفع مستواكم" icon={<Sparkles className="size-5" />} />
          <ol className="mt-4 space-y-2">{snap.gaps.slice(0, 10).map((g, i) => <li key={g.id} className="flex items-center gap-3 rounded-xl border border-line p-3 text-sm"><span className="grid size-7 place-items-center rounded-full bg-forest-950 text-xs font-bold text-white num">{i + 1}</span><span className="flex-1">{F[g.id]?.name}</span><LevelChip level={g.level} size="sm" /><span className="text-xs text-muted">← 4</span></li>)}</ol>
        </Card>
        <Card className="p-6">
          <CardTitle title="توصيات المقيّم" icon={<Lightbulb className="size-5" />} />
          {a.assessorSummary && <p className="mt-4 rounded-2xl bg-forest-50 p-4 text-sm leading-7">{a.assessorSummary}</p>}
          <ul className="mt-4 space-y-2">{recs.sort((x, y) => x.priority - y.priority).map((x, i) => <li key={i} className="flex gap-3 text-sm leading-6"><BadgeCheck className={`mt-0.5 size-4 shrink-0 ${x.priority === 1 ? 'text-orange-brand' : 'text-forest-600'}`} />{x.text}</li>)}</ul>
        </Card>
      </div>

      <Card className="p-6">
        <CardTitle title="مستويات العوامل الـ56" subtitle="المستوى المعتمد لكل عامل من 0 إلى 4" />
        <div className="mt-5 space-y-6">
          {SECTIONS.map(s => { const list = fs.filter(f => f.section === s.key).sort((x, y) => x.sortOrder - y.sortOrder); return (
            <div key={s.key}><div className="mb-2 text-sm font-semibold text-forest-800">{s.title}</div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{list.map(f => <div key={f.id} className="flex items-center gap-3 rounded-xl border border-line p-2.5 text-sm"><LevelChip level={snap.levels[f.id]} size="sm" /><span className="min-w-0 flex-1 truncate" title={f.name}>{f.name}</span><span className="ltr text-[11px] text-muted">{f.id}</span></div>)}</div>
            </div>); })}
        </div>
      </Card>
    </div>
  );
}
