'use client';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, Bot, Building2, Calculator, Check, CheckCheck, ChevronDown, CircleAlert, ClipboardCheck, Eye, FileText, Flag, Keyboard, Loader2, MessageSquarePlus, MessageSquareText, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { evaluate, AXES, GATES, TRACK_REQ, FACTOR_IDS, type TrackCode } from '@/lib/scoring';
import { saveReview, acceptAiSuggestions, createInfoRequest, closeInfoRequest, completeDeskAction, startReview } from '@/app/actions/assessor';
import { EfficiencyLabel, LevelChip, Button } from '@/components/ui';
import { Submit, FormMessage, PendingCtx, useFormAction } from '@/components/client/submit';
import { STATUS, TRACK_LABEL, LEVEL_SCALE } from '@/lib/domain';
import { cn } from '@/lib/cn';
import type { DocAnalysis } from '@/lib/ai';
import type { AssessmentStatus } from '@/db/schema';

export type WFactor = { id: string; name: string; section: string; group: string; axis: number | null; weight: number | null; question: string; definition: string; levels: string[]; rule: string; flags: string[]; calc: string; evidence: string[]; asks: string[]; example: string };
export type WReview = { level: number | null; aiLevel: number | null; aiConfidence: number | null; aiRationale: string | null; justification: string; evidenceRef: string; needsVerification: boolean };
type WAns = { status: string | null; selfLevel: number | null; answer: string };
type WDoc = { id: string; fileName: string; mimeType: string; size: number; requirement: string | null; reqFactors: string[]; aiStatus: string; ai: DocAnalysis | null };
type WReq = { id: string; factorId: string | null; message: string; response: string | null; status: string; createdAt: string };
const ANS_LABEL: Record<string, { t: string; c: string }> = { YES: { t: 'مطبّق', c: 'bg-forest-100 text-forest-800' }, PARTIAL: { t: 'جزئي', c: 'bg-lime-100 text-forest-900' }, NONE: { t: 'غير مطبّق', c: 'bg-orange-50 text-orange-800' }, NA: { t: 'لا ينطبق', c: 'bg-slate-100 text-slate-700' } };
const EMPTY: WReview = { level: null, aiLevel: null, aiConfidence: null, aiRationale: null, justification: '', evidenceRef: '', needsVerification: false };

export function Workspace(p: {
  assessment: { id: string; number: string; status: AssessmentStatus; track: string; expenses: number; cycleYear: number; progress: number; assessor: string | null; summary: string };
  org: { name: string; city: string; field: string; beneficiaries: number | null; programs: number | null; employees: number | null; revenue: number | null; programExpenses: number | null; description: string };
  phase: 'DESK' | 'VERIFIED'; editable: boolean; factors: WFactor[]; sections: { key: string; title: string }[]; focus?: string;
  answers: Record<string, WAns>; reviews: Record<string, WReview>; deskReviews?: Record<string, WReview>; docs: WDoc[]; requests: WReq[]; visitId: string | null;
}) {
  const { assessment: A, phase, editable, factors } = p;
  const router = useRouter();
  const [rv, setRv] = useState<Record<string, WReview>>(p.reviews);
  const [openId, setOpenId] = useState<string | null>(p.focus ?? null);
  const [filter, setFilter] = useState<'all' | 'todo' | 'done' | 'flag' | 'diff'>('all');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'factors' | 'docs' | 'requests' | 'org'>('factors');
  const [final, setFinal] = useState(false);
  const [saving, setSaving] = useState(0);
  const [aiPending, startAi] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const levels = useMemo(() => Object.fromEntries(FACTOR_IDS.map(f => [f, rv[f]?.level ?? 0])), [rv]);
  const score = useMemo(() => evaluate(levels, A.expenses), [levels, A.expenses]);
  const reviewed = factors.filter(f => rv[f.id]?.level != null).length;
  const openReqs = p.requests.filter(r => r.status === 'OPEN');
  const docsFor = useCallback((fid: string) => p.docs.filter(d => d.reqFactors.includes(fid) || d.ai?.factorEvidence?.some(e => e.factorId === fid)), [p.docs]);

  const visible = factors.filter(f => {
    const r = rv[f.id];
    if (q && !(f.name + f.id).includes(q)) return false;
    if (filter === 'todo') return r?.level == null;
    if (filter === 'done') return r?.level != null;
    if (filter === 'flag') return !!r?.needsVerification || p.requests.some(x => x.factorId === f.id && x.status === 'OPEN');
    if (filter === 'diff') return r?.level != null && r.aiLevel != null && Math.abs(r.level - r.aiLevel) >= 2;
    return true;
  });

  function persist(fid: string, patch: Partial<WReview>, delay = 0) {
    setRv(s => ({ ...s, [fid]: { ...(s[fid] ?? EMPTY), ...patch } }));
    if (!editable) return;
    clearTimeout(timers.current[fid]);
    const run = async () => { setSaving(n => n + 1); try { await saveReview(A.id, fid, phase, { level: patch.level, justification: patch.justification, evidenceRef: patch.evidenceRef, needsVerification: patch.needsVerification }); } finally { setSaving(n => n - 1); } };
    if (delay) timers.current[fid] = setTimeout(run, delay); else void run();
  }

  const idx = openId ? visible.findIndex(f => f.id === openId) : -1;
  const nav = (d: 1 | -1) => { const list = visible.length ? visible : factors; const i = list.findIndex(f => f.id === openId); const n = list[i + d]; if (n) setOpenId(n.id); };
  const open = openId ? factors.find(f => f.id === openId) ?? null : null;

  return (
    <div className="space-y-5">
      {/* رأس مساحة العمل */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-5 p-5 md:p-6">
          <div className="grid size-12 place-items-center rounded-2xl bg-forest-950 text-lime-brand"><Building2 /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className="ltr font-mono">{A.number}</span>·<span>المسار {TRACK_LABEL[A.track as TrackCode]}</span>·<span>السنة المالية {A.cycleYear}</span>·<span className="num">المصروفات {A.expenses.toLocaleString('en-US')} ر.س</span></div>
            <h1 className="mt-0.5 font-display text-2xl font-bold">{p.org.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-forest-50 px-2.5 py-0.5 font-semibold text-forest-800">{STATUS[A.status].label}</span>{phase === 'VERIFIED' && <span className="rounded-full bg-teal-50 px-2.5 py-0.5 font-semibold text-teal-800">مرحلة التحقق الميداني</span>}{!editable && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">للعرض فقط</span>}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && phase === 'DESK' && A.status === 'SUBMITTED' && <form action={startReview.bind(null, A.id)}><Submit variant="lime">ابدأ المراجعة</Submit></form>}
            {editable && phase === 'DESK' && <Button variant="outline" disabled={aiPending} onClick={() => startAi(async () => { const r = await acceptAiSuggestions(A.id); alertMsg(`اعتُمدت ${r.count} مقترحات للعوامل غير المقدّرة`); router.refresh(); location.reload(); })}>{aiPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} اعتماد مقترحات المساعد للمتبقي</Button>}
            {editable && phase === 'DESK' && <Button onClick={() => setFinal(true)}><ClipboardCheck className="size-4" /> اعتماد التقييم</Button>}
            {phase === 'VERIFIED' && p.visitId && <Link href={`/assessor/visits/${p.visitId}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-forest-800 px-5 font-semibold text-white">ملف الزيارة</Link>}
          </div>
        </div>
        <div className="flex gap-1 border-t border-line bg-forest-50/40 px-3">
          {([['factors', 'العوامل الـ56'], ['docs', `الملفات (${p.docs.length})`], ['requests', `الاستيضاحات${openReqs.length ? ` (${openReqs.length})` : ''}`], ['org', 'بيانات الجهة']] as const).map(([k, t]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('border-b-2 px-4 py-3 text-sm font-semibold transition', tab === k ? 'border-forest-800 text-forest-900' : 'border-transparent text-muted hover:text-ink')}>{t}</button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_21rem]">
        <div className="min-w-0">
          {tab === 'factors' && (
            <div className="space-y-5">
              <div className="card flex flex-wrap items-center gap-3 p-3">
                <div className="relative min-w-48 flex-1"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث باسم العامل أو رمزه" className="input h-10 pr-9" /></div>
                <div className="flex flex-wrap rounded-xl bg-forest-50 p-1 text-sm">
                  {([['all', 'الكل'], ['todo', 'لم يُقدّر'], ['done', 'مُقدّر'], ['flag', 'يحتاج تحقق'], ['diff', 'فرق كبير مع المساعد']] as const).map(([k, t]) => <button key={k} onClick={() => setFilter(k)} className={cn('rounded-lg px-3 py-1.5 font-semibold', filter === k ? 'bg-white shadow-sm' : 'text-muted')}>{t}</button>)}
                </div>
              </div>
              {p.sections.map(s => {
                const list = visible.filter(f => f.section === s.key); if (!list.length) return null;
                return (
                  <section key={s.key}>
                    <div className="mb-2.5 flex items-center justify-between px-1"><h3 className="font-display font-semibold">{s.title}</h3><span className="num text-xs text-muted">{factors.filter(f => f.section === s.key && rv[f.id]?.level != null).length}/{factors.filter(f => f.section === s.key).length}</span></div>
                    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                      {list.map(f => { const r = rv[f.id]; const an = p.answers[f.id]; const dk = p.deskReviews?.[f.id]; const req = p.requests.some(x => x.factorId === f.id && x.status === 'OPEN'); const nd = docsFor(f.id).length; return (
                        <button key={f.id} onClick={() => setOpenId(f.id)} className={cn('group flex flex-col rounded-2xl border bg-white p-4 text-right transition hover:-translate-y-0.5 hover:shadow-md', r?.level != null ? 'border-forest-200' : 'border-line', f.group === 'بوابة' && 'ring-1 ring-orange-200')}>
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><span className="ltr text-[11px] font-bold text-forest-700">{f.id}</span><span className="text-[11px] text-muted">{f.group}</span></div><div className="mt-1 line-clamp-2 text-sm font-semibold leading-6">{f.name}</div></div>
                            <LevelChip level={r?.level} />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {an?.status ? <span className={cn('rounded-full px-2 py-0.5 font-semibold', ANS_LABEL[an.status]?.c)}>الجهة: {ANS_LABEL[an.status]?.t}{an.selfLevel != null ? ` · ${an.selfLevel}` : ''}</span> : <span className="rounded-full bg-slate-50 px-2 py-0.5 text-muted">بلا إجابة</span>}
                            {phase === 'DESK' && r?.aiLevel != null && <span className="inline-flex items-center gap-1 rounded-full bg-forest-950 px-2 py-0.5 text-lime-brand"><Bot className="size-3" />{r.aiLevel}</span>}
                            {dk?.level != null && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-800">المكتبي {dk.level}</span>}
                            {nd > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-amber-900"><FileText className="size-3" />{nd}</span>}
                            {r?.needsVerification && <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-teal-800"><Flag className="size-3" />تحقق</span>}
                            {req && <span className="inline-flex items-center gap-1 rounded-full bg-orange-brand px-2 py-0.5 text-white"><MessageSquareText className="size-3" />استيضاح</span>}
                          </div>
                        </button>
                      ); })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          {tab === 'docs' && <DocsTab docs={p.docs} />}
          {tab === 'requests' && <RequestsTab id={A.id} requests={p.requests} factors={factors} editable={editable && phase === 'DESK'} />}
          {tab === 'org' && <OrgTab org={p.org} />}
        </div>

        {/* لوحة الدرجة الحية */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:h-fit">
          <div className="card p-5">
            <div className="flex items-center justify-between"><div className="text-xs font-semibold text-forest-600">الدرجة الحية</div><div className={cn('flex items-center gap-1 text-[11px]', saving ? 'text-amber-700' : 'text-forest-700')}>{saving ? <><Loader2 className="size-3 animate-spin" /> يحفظ</> : <><Check className="size-3" /> محفوظ</>}</div></div>
            <div className="mt-2 flex items-end gap-2"><motion.span key={score.total} initial={{ scale: 1.15, opacity: .6 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-5xl font-black num">{score.total.toFixed(1)}</motion.span><span className="mb-1.5 text-sm text-muted">/ 100</span></div>
            <div className="mt-1 text-sm font-semibold">{score.status === 'مؤهل' ? `المستوى «${score.level}»` : 'قيد التأهيل'}{score.baseLevel !== score.level && <span className="font-normal text-muted"> (قبل السقوف {score.baseLevel})</span>}</div>
            <div className="mt-4"><EfficiencyLabel level={score.level} score={score.total} compact qualified={score.status === 'مؤهل'} /></div>
            <div className="mt-4 space-y-2.5">
              {Object.entries(AXES).map(([k, ax]) => { const v = k === '3' ? score.a3adj : score.axes[k]; return (
                <div key={k}><div className="flex justify-between text-[11px]"><span className="text-muted">{ax.short}</span><span className="num font-semibold">{v.toFixed(1)}/{ax.pts}</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-forest-100"><div className="h-full rounded-full bg-forest-700 transition-all" style={{ width: `${(v / ax.pts) * 100}%` }} /></div></div>
              ); })}
            </div>
            <div className="mt-4 border-t border-line pt-3 text-xs"><div className="mb-1 flex justify-between"><span className="text-muted">العوامل المقدّرة</span><span className="num font-bold">{reviewed}/{factors.length}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-forest-100"><div className="spectrum-rtl h-full" style={{ width: `${(reviewed / factors.length) * 100}%` }} /></div></div>
          </div>
          <div className="card p-5 text-sm">
            <div className="mb-2 font-semibold">البوابات ومتطلبات المسار</div>
            <ul className="space-y-1.5">
              {Object.entries(GATES).map(([f, m]) => { const ok = (levels[f] ?? 0) >= m; return <li key={f}><button onClick={() => setOpenId(f)} className="flex w-full items-center gap-2 text-right"><span className={cn('grid size-5 place-items-center rounded-full', ok ? 'bg-forest-700 text-white' : 'bg-orange-brand text-white')}>{ok ? <Check className="size-3" /> : <X className="size-3" />}</span><span className="ltr text-xs font-semibold">{f}</span><span className="flex-1 truncate text-xs text-muted">{factors.find(x => x.id === f)?.name}</span><span className="num text-xs">{levels[f] ?? 0}/{m}</span></button></li>; })}
              {Object.entries(TRACK_REQ).map(([f, m]) => { const need = m[A.track as TrackCode]; if (!need) return null; const ok = (levels[f] ?? 0) >= need; return <li key={f}><button onClick={() => setOpenId(f)} className="flex w-full items-center gap-2 text-right"><span className={cn('grid size-5 place-items-center rounded-full', ok ? 'bg-forest-100 text-forest-800' : 'bg-amber-100 text-amber-800')}>{ok ? <Check className="size-3" /> : <CircleAlert className="size-3" />}</span><span className="ltr text-xs font-semibold">{f}</span><span className="flex-1 truncate text-xs text-muted">مسار: {factors.find(x => x.id === f)?.name}</span><span className="num text-xs">{levels[f] ?? 0}/{need}</span></button></li>; })}
            </ul>
            {score.caps.length > 0 && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">{score.caps.map((c, i) => <div key={i}>سقف: {c[0]} ← {c[1]} — {c[2]}</div>)}</div>}
          </div>
          <div className="card flex items-center gap-2 p-4 text-[11px] text-muted"><Keyboard className="size-4 shrink-0" /> في نافذة العامل: الأرقام 0–4 لاختيار المستوى، والأسهم للتنقل، وEsc للإغلاق.</div>
        </aside>
      </div>

      <AnimatePresence>
        {open && <FactorWindow key="fw" f={open} r={rv[open.id] ?? EMPTY} desk={p.deskReviews?.[open.id]} an={p.answers[open.id]} docs={docsFor(open.id)} requests={p.requests.filter(x => x.factorId === open.id)}
          editable={editable} phase={phase} assessmentId={A.id} pos={`${idx + 1} / ${visible.length}`} onClose={() => setOpenId(null)} onNav={nav} onChange={(patch, delay) => persist(open.id, patch, delay)} />}
        {final && <FinalWindow key="final" id={A.id} reviewed={reviewed} total={factors.length} score={score} summary={A.summary} openReqs={openReqs.length} factors={factors} onClose={() => setFinal(false)} />}
      </AnimatePresence>
    </div>
  );
}
function alertMsg(m: string) { if (typeof window !== 'undefined') console.info(m); }

// ---------------------------------------------------------------- نافذة تقييم العامل
function FactorWindow({ f, r, desk, an, docs, requests, editable, phase, assessmentId, pos, onClose, onNav, onChange }: {
  f: WFactor; r: WReview; desk?: WReview; an?: WAns; docs: WDoc[]; requests: WReq[]; editable: boolean; phase: 'DESK' | 'VERIFIED'; assessmentId: string; pos: string;
  onClose: () => void; onNav: (d: 1 | -1) => void; onChange: (patch: Partial<WReview>, delay?: number) => void;
}) {
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement; if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') { if (e.key === 'Escape') t.blur(); return; }
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onNav(1); else if (e.key === 'ArrowRight') onNav(-1);
      else if (editable && /^[0-4]$/.test(e.key)) onChange({ level: Number(e.key) });
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [onClose, onNav, onChange, editable]);
  const ev = docs.flatMap(d => (d.ai?.factorEvidence ?? []).filter(e => e.factorId === f.id).map(e => ({ ...e, doc: d })));
  return (
    <motion.div className="fixed inset-0 z-50 flex items-stretch justify-center bg-forest-950/50 p-0 backdrop-blur-sm md:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: 'spring', damping: 26, stiffness: 300 }} onClick={e => e.stopPropagation()} className="flex w-full max-w-7xl flex-col overflow-hidden bg-paper shadow-2xl md:rounded-[26px]">
        <div className="flex items-center gap-4 border-b border-line bg-white px-5 py-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest-950 font-display text-sm font-bold text-lime-brand ltr">{f.id}</div>
          <div className="min-w-0 flex-1"><div className="text-xs text-muted">{f.group}{f.axis ? ` · المحور ${f.axis}` : ''}{f.weight ? ` · الوزن ${f.weight}` : ''}</div><div className="truncate font-display text-lg font-semibold">{f.name}</div></div>
          <span className="hidden text-xs text-muted num sm:block">{pos}</span>
          <button onClick={() => onNav(-1)} className="grid size-10 place-items-center rounded-xl border border-line hover:bg-forest-50" title="السابق"><ArrowRight className="size-4" /></button>
          <button onClick={() => onNav(1)} className="grid size-10 place-items-center rounded-xl border border-line hover:bg-forest-50" title="التالي"><ArrowLeft className="size-4" /></button>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-xl bg-forest-50 hover:bg-forest-100" title="إغلاق"><X className="size-5" /></button>
        </div>
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-2">
          {/* ما قدمته الجهة والأدلة */}
          <div className="min-h-0 space-y-5 overflow-y-auto border-line p-5 md:p-6 lg:border-l">
            <div className="text-sm font-semibold text-forest-700">ما قدّمته الجهة</div>
            <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
              <div className="mb-3 flex flex-wrap items-center gap-2">{an?.status ? <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', ANS_LABEL[an.status]?.c)}>{ANS_LABEL[an.status]?.t}</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">لم تُجب الجهة</span>}{an?.selfLevel != null && <span className="flex items-center gap-1.5 text-xs text-muted">التقدير الذاتي <LevelChip level={an.selfLevel} size="sm" /></span>}</div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-ink-2">{an?.answer || <span className="text-muted">لا وصف.</span>}</p>
            </div>
            {phase === 'DESK' && r.aiLevel != null && (
              <div className="rounded-2xl bg-forest-950 p-5 text-white">
                <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold text-lime-brand"><Bot className="size-4" /> مقترح المساعد الذكي</div>{editable && r.level !== r.aiLevel && <button onClick={() => onChange({ level: r.aiLevel, justification: r.justification || `وفق مقترح المساعد: ${r.aiRationale ?? ''}` })} className="rounded-lg bg-lime-brand px-3 py-1 text-xs font-bold text-forest-950">اعتماد المقترح</button>}</div>
                <div className="flex items-center gap-4"><span className="font-display text-4xl font-black num">{r.aiLevel}</span><div className="flex-1"><div className="text-xs text-white/60">الثقة {Math.round((r.aiConfidence ?? 0) * 100)}٪</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-lime-brand" style={{ width: `${(r.aiConfidence ?? 0) * 100}%` }} /></div></div></div>
                {r.aiRationale && <p className="mt-3 text-sm leading-6 text-white/80">{r.aiRationale}</p>}
              </div>
            )}
            {desk && <div className="rounded-2xl bg-violet-50 p-4 text-sm"><div className="mb-1 font-semibold text-violet-900">التقدير المكتبي: المستوى {desk.level ?? '—'}</div>{desk.justification && <p className="text-violet-950/80">{desk.justification}</p>}</div>}
            <div>
              <div className="mb-2 text-sm font-semibold">الأدلة المرتبطة ({docs.length})</div>
              {docs.length ? <div className="space-y-2">{docs.map(d => { const e = ev.find(x => x.doc.id === d.id); return (
                <div key={d.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                  <div className="flex items-center gap-2"><FileText className="size-4 shrink-0 text-forest-700" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.fileName}</span>{e && <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px]">مقترح {e.suggestedLevel}</span>}<a href={`/api/files/${d.id}`} target="_blank" className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs hover:border-forest-500"><Eye className="size-3.5" /> فتح</a></div>
                  {d.requirement && <div className="mt-1 text-xs text-muted">ضمن: {d.requirement}</div>}
                  {e ? <p className="mt-2 text-sm leading-6 text-ink-2">{e.rationale}{e.quote && <span className="mt-1 block rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-950">«{e.quote}»</span>}</p> : d.ai?.summary && <p className="mt-2 text-xs leading-5 text-muted">{d.ai.summary}</p>}
                </div>); })}</div> : <div className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">لا ملفات مرتبطة بهذا العامل. القاعدة: التصريح دون دليل لا يتجاوز المستوى 1.</div>}
            </div>
            {requests.length > 0 && <div className="space-y-2"><div className="text-sm font-semibold">الاستيضاحات</div>{requests.map(x => <div key={x.id} className="rounded-2xl bg-orange-50 p-3 text-sm"><div>{x.message}</div>{x.response && <div className="mt-2 rounded-xl bg-white p-2.5 text-ink-2">رد الجهة: {x.response}</div>}</div>)}</div>}
            {editable && phase === 'DESK' && (ask ? <AskForm assessmentId={assessmentId} factorId={f.id} onDone={() => setAsk(false)} /> : <button onClick={() => setAsk(true)} className="flex items-center gap-2 text-sm font-semibold text-orange-brand hover:underline"><MessageSquarePlus className="size-4" /> طلب استيضاح من الجهة حول هذا العامل</button>)}
          </div>
          {/* معيار التقدير */}
          <div className="min-h-0 space-y-5 overflow-y-auto bg-white p-5 md:p-6">
            <div><div className="text-sm font-semibold text-forest-700">سؤال العامل</div><p className="mt-1 font-display text-lg leading-8">{f.question}</p></div>
            {f.definition && <details className="rounded-2xl bg-forest-50 p-4 text-sm leading-7"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold"><ChevronDown className="size-4" /> التعريف{f.calc ? ' وطريقة الاحتساب' : ''}</summary><p className="mt-2">{f.definition}</p>{f.calc && <div className="mt-3 flex gap-2 rounded-xl bg-white p-3"><Calculator className="mt-1 size-4 shrink-0 text-forest-700" /><span>{f.calc}</span></div>}</details>}
            <div>
              <div className="mb-2 text-sm font-semibold">اختر المستوى المثبت بالأدلة</div>
              <div className="space-y-2">
                {f.levels.map((d, lv) => { const on = r.level === lv; const L = LEVEL_SCALE[lv]; return (
                  <button key={lv} disabled={!editable} onClick={() => onChange({ level: lv })} className={cn('flex w-full items-start gap-3 rounded-2xl border p-3.5 text-right text-sm leading-6 transition disabled:cursor-default', on ? 'border-transparent shadow-lg ring-2 ring-forest-800' : 'border-line hover:border-forest-300')} style={on ? { background: L.color, color: L.text } : undefined}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl font-display text-lg font-bold num" style={{ background: on ? 'rgba(255,255,255,.25)' : L.color, color: on ? 'inherit' : L.text }}>{lv}</span>
                    <span className="flex-1"><b>{L.name}: </b>{d}</span>{on && <CheckCheck className="mt-1 size-5 shrink-0" />}
                  </button>); })}
              </div>
            </div>
            {f.rule && <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-amber-950"><ShieldCheck className="mt-1 size-5 shrink-0 text-amber-700" /><div><b>قاعدة التقدير: </b>{f.rule}</div></div>}
            {f.flags.length > 0 && <div className="rounded-2xl bg-rose-50 p-4 text-sm"><div className="mb-1.5 flex items-center gap-2 font-semibold text-rose-800"><AlertTriangle className="size-4" /> علامات تحذير</div><ul className="space-y-1 leading-6 text-rose-950/80">{f.flags.map((x, i) => <li key={i}>• {x}</li>)}</ul></div>}
            <label className="block"><span className="label">مبرر التقدير</span><textarea disabled={!editable} value={r.justification} onChange={e => onChange({ justification: e.target.value }, 800)} rows={4} className="input py-3 leading-7" placeholder="ما الدليل الذي بنيت عليه المستوى؟ وما الذي منع المستوى الأعلى؟" /></label>
            <label className="block"><span className="label">مرجع الدليل</span><input disabled={!editable} value={r.evidenceRef} onChange={e => onChange({ evidenceRef: e.target.value }, 800)} className="input" placeholder="اسم الملف ورقم الصفحة أو الجدول" /></label>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line p-4"><input type="checkbox" disabled={!editable} checked={r.needsVerification} onChange={e => onChange({ needsVerification: e.target.checked })} className="size-5 accent-forest-700" /><span className="text-sm"><b>يحتاج تحققاً ميدانياً</b><span className="block text-xs text-muted">يظهر للمستشار في زيارة التحقق ضمن قائمة العينة</span></span></label>
            <div className="sticky bottom-0 -mx-5 flex items-center justify-between gap-3 border-t border-line bg-white/95 px-5 py-3 backdrop-blur md:-mx-6 md:px-6">
              <span className="text-xs text-muted">يُحفظ تلقائياً</span>
              <Button onClick={() => onNav(1)}>التالي <ArrowLeft className="size-4" /></Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AskForm({ assessmentId, factorId, onDone }: { assessmentId: string; factorId?: string; onDone?: () => void }) {
  const [state, onSubmit, pending] = useFormAction(createInfoRequest);
  const router = useRouter(); const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { ref.current?.reset(); router.refresh(); onDone?.(); } }, [state, router, onDone]);
  return (
    <PendingCtx.Provider value={pending}><form ref={ref} onSubmit={onSubmit} className="space-y-2 rounded-2xl bg-orange-50/60 p-4 ring-1 ring-orange-200">
      <input type="hidden" name="assessmentId" value={assessmentId} />{factorId && <input type="hidden" name="factorId" value={factorId} />}
      <textarea name="message" rows={3} className="input py-3" placeholder="مثال: نحتاج جدول المرشحات الأربعة بنسبها ومصدر كل نسبة لبرنامج التوظيف." />
      <div className="flex items-center gap-2"><Submit size="sm" pendingText="…">إرسال للجهة</Submit>{onDone && <button type="button" onClick={onDone} className="text-sm text-muted">إلغاء</button>}</div>
      <FormMessage state={state} />
    </form></PendingCtx.Provider>
  );
}

function DocsTab({ docs }: { docs: WDoc[] }) {
  if (!docs.length) return <div className="card p-10 text-center text-muted">لم ترفع الجهة ملفات.</div>;
  return (
    <div className="space-y-3">{docs.map(d => (
      <details key={d.id} className="card group overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-4"><FileText className="size-5 text-forest-700" /><div className="min-w-0 flex-1"><div className="truncate font-semibold">{d.fileName}</div><div className="text-xs text-muted">{d.requirement ?? 'ملف إضافي'}{d.ai?.docType ? ` · ${d.ai.docType}` : ''}{d.ai?.period ? ` · ${d.ai.period}` : ''}</div></div><a href={`/api/files/${d.id}`} target="_blank" onClick={e => e.stopPropagation()} className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold hover:border-forest-500">فتح الملف</a><ChevronDown className="size-4 text-muted transition group-open:rotate-180" /></summary>
        {d.ai && <div className="space-y-3 border-t border-line p-5 text-sm">
          <p className="leading-7">{d.ai.summary}</p>
          {d.ai.keyFacts?.length > 0 && <div className="grid gap-2 sm:grid-cols-3">{d.ai.keyFacts.map((k, i) => <div key={i} className="rounded-xl bg-forest-50 p-2.5"><div className="text-[11px] text-muted">{k.label}</div><div className="font-semibold">{k.value}</div></div>)}</div>}
          {d.ai.factorEvidence?.length > 0 && <div className="flex flex-wrap gap-1.5">{d.ai.factorEvidence.map((e, i) => <span key={i} title={e.rationale} className="rounded-lg border border-line px-2 py-1 text-xs"><b className="ltr">{e.factorId}</b> ← {e.suggestedLevel} ({Math.round(e.confidence * 100)}٪)</span>)}</div>}
          {d.ai.issues?.length > 0 && <ul className="rounded-xl bg-amber-50 p-3 text-amber-950">{d.ai.issues.map((x, i) => <li key={i}>• {x}</li>)}</ul>}
        </div>}
      </details>
    ))}</div>
  );
}

function RequestsTab({ id, requests, factors, editable }: { id: string; requests: WReq[]; factors: WFactor[]; editable: boolean }) {
  const router = useRouter(); const [pending, start] = useTransition();
  return (
    <div className="space-y-4">
      {editable && <AskForm assessmentId={id} />}
      {requests.map(r => (
        <div key={r.id} className="card p-5">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs"><span className={cn('rounded-full px-2 py-0.5 font-semibold', r.status === 'OPEN' ? 'bg-orange-brand text-white' : r.status === 'ANSWERED' ? 'bg-forest-100 text-forest-800' : 'bg-slate-100 text-slate-600')}>{r.status === 'OPEN' ? 'بانتظار الجهة' : r.status === 'ANSWERED' ? 'ردّت الجهة' : 'مغلق'}</span>{r.factorId && <span className="ltr font-semibold">{r.factorId}</span>}<span className="text-muted">{factors.find(f => f.id === r.factorId)?.name}</span></div>
          <p className="leading-7">{r.message}</p>
          {r.response && <div className="mt-3 rounded-2xl bg-forest-50 p-3 text-sm leading-7">{r.response}</div>}
          {editable && r.status !== 'CLOSED' && <button disabled={pending} onClick={() => start(async () => { await closeInfoRequest(r.id); router.refresh(); })} className="mt-3 text-sm font-semibold text-forest-700 hover:underline">إغلاق الاستيضاح</button>}
        </div>
      ))}
      {!requests.length && !editable && <div className="card p-10 text-center text-muted">لا استيضاحات.</div>}
    </div>
  );
}

function OrgTab({ org }: { org: { name: string; city: string; field: string; beneficiaries: number | null; programs: number | null; employees: number | null; revenue: number | null; programExpenses: number | null; description: string } }) {
  const items = [['المدينة', org.city], ['المجال', org.field], ['المستفيدون', org.beneficiaries?.toLocaleString('en-US')], ['البرامج', org.programs], ['الموظفون', org.employees], ['الإيرادات', org.revenue ? org.revenue.toLocaleString('en-US') + ' ر.س' : '—'], ['مصروفات البرامج', org.programExpenses ? org.programExpenses.toLocaleString('en-US') + ' ر.س' : '—']];
  return <div className="card p-6"><div className="grid gap-4 sm:grid-cols-3">{items.map(([k, v]) => <div key={String(k)} className="rounded-2xl bg-forest-50 p-4"><div className="text-xs text-muted">{k}</div><div className="font-semibold num">{v ?? '—'}</div></div>)}</div>{org.description && <p className="mt-5 leading-7 text-ink-2">{org.description}</p>}</div>;
}

// ---------------------------------------------------------------- نافذة الاعتماد
function FinalWindow({ id, reviewed, total, score, summary, openReqs, factors, onClose }: { id: string; reviewed: number; total: number; score: ReturnType<typeof evaluate>; summary: string; openReqs: number; factors: WFactor[]; onClose: () => void }) {
  const [state, onSubmit, pending] = useFormAction(completeDeskAction);
  const router = useRouter();
  useEffect(() => { if (state?.ok) { const t = setTimeout(() => router.refresh(), 1200); return () => clearTimeout(t); } }, [state?.ok, router]);
  const nm = (f: string) => factors.find(x => x.id === f)?.name ?? f;
  const recs = [...score.gateFail.map(([f, , m]) => `استيفاء البوابة: ${nm(f)} (المستوى ${m} على الأقل)`), ...score.trkFail.map(([f, , m]) => `متطلب المسار: رفع ${nm(f)} إلى المستوى ${m}`), ...score.gaps.slice(0, 6).map(g => `تطوير ${nm(g.id)} من المستوى ${g.level}`)].join('\n');
  const ready = reviewed === total && !openReqs;
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center bg-forest-950/50 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div initial={{ scale: .96 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[26px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line p-5"><div className="font-display text-xl font-bold">اعتماد التقييم المكتبي</div><button onClick={onClose} className="grid size-9 place-items-center rounded-xl bg-forest-50"><X className="size-4" /></button></div>
        {state?.ok ? (
          <div className="space-y-4 p-10 text-center"><div className="mx-auto grid size-16 place-items-center rounded-full bg-forest-700 text-white"><Check className="size-8" /></div><div className="font-display text-xl font-bold">{state?.ok}</div><p className="text-sm text-muted">صدرت إفادة النتيجة غير الموثقة، وأُشعرت الجهة.</p></div>
        ) : (
          <PendingCtx.Provider value={pending}><form onSubmit={onSubmit} className="space-y-5 p-6">
            <input type="hidden" name="assessmentId" value={id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-forest-50 p-4"><div className="text-xs text-muted">الدرجة</div><div className="font-display text-3xl font-black num">{score.total.toFixed(1)}</div></div>
              <div className="rounded-2xl bg-forest-50 p-4"><div className="text-xs text-muted">المستوى</div><div className="font-display text-xl font-bold">{score.status === 'مؤهل' ? score.level : 'قيد التأهيل'}</div></div>
              <div className={cn('rounded-2xl p-4', reviewed === total ? 'bg-forest-50' : 'bg-orange-50')}><div className="text-xs text-muted">العوامل المقدّرة</div><div className="font-display text-3xl font-black num">{reviewed}/{total}</div></div>
            </div>
            {!ready && <div className="rounded-2xl bg-orange-50 p-4 text-sm text-orange-900">{reviewed < total && <div>بقي {total - reviewed} عاملاً دون تقدير. قدّرها أو اعتمد مقترحات المساعد.</div>}{openReqs > 0 && <div>توجد {openReqs} استيضاحات مفتوحة.</div>}</div>}
            <label className="block"><span className="label">خلاصة المقيّم للجهة</span><textarea name="summary" defaultValue={summary} rows={4} className="input py-3 leading-7" placeholder="أبرز نقاط القوة، وأهم ما يحد من المستوى، وما الذي سيتحقق منه المستشار في الزيارة." /></label>
            <label className="block"><span className="label">التوصيات (توصية في كل سطر، الأهم أولاً)</span><textarea name="recommendations" defaultValue={recs} rows={7} className="input py-3 leading-7" /></label>
            <Submit size="lg" variant="lime" className="w-full" disabled={!ready} pendingText="جارٍ الاعتماد وإصدار الإفادة…"><ClipboardCheck className="size-5" /> اعتماد وإصدار النتيجة غير الموثقة</Submit>
            <FormMessage state={state} />
          </form></PendingCtx.Provider>
        )}
      </motion.div>
    </motion.div>
  );
}
