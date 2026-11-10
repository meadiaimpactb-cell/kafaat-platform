'use client';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CheckCircle2, ChevronDown, CircleDashed, CloudCheck, FileText, Info, Loader2, Lightbulb, Search, Target, Wallet, LineChart, Scale, Cog, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { saveAnswer } from '@/app/actions/org';
import { cn } from '@/lib/cn';

export type QFactor = { id: string; name: string; section: string; question: string; definition: string; asks: string[]; evidence: string[]; levels: string[]; group: string; tier: string; docs: string[] };
type Ans = { status: 'NONE' | 'PARTIAL' | 'YES' | 'NA' | null; selfLevel: number | null; answer: string };
const SEC_ICON: Record<string, typeof Target> = { impact: Target, resources: Wallet, measurement: LineChart, accountability: Scale, drivers: Cog };
const STATUS_OPTS: { v: Ans['status']; t: string; cls: string }[] = [
  { v: 'YES', t: 'مطبّق وموثق', cls: 'data-[on=true]:bg-forest-700 data-[on=true]:text-white' },
  { v: 'PARTIAL', t: 'مطبّق جزئياً', cls: 'data-[on=true]:bg-lime-brand data-[on=true]:text-forest-950' },
  { v: 'NONE', t: 'غير مطبّق', cls: 'data-[on=true]:bg-orange-brand data-[on=true]:text-white' },
  { v: 'NA', t: 'لا ينطبق', cls: 'data-[on=true]:bg-slate-600 data-[on=true]:text-white' },
];
const LV = ['#E9EDE6', '#DCEFD2', '#B9DCA8', '#5FA24A', '#0B5233'];
const LVN = ['غير مثبت', 'أولي', 'نامٍ', 'متقدم', 'رائد'];

export function QuestionsBoard({ assessmentId, editable, factors, initial, sections, progress: p0, focus }: { assessmentId: string; editable: boolean; factors: QFactor[]; initial: Record<string, Ans>; sections: { key: string; title: string; desc: string }[]; progress: number; focus?: string }) {
  const [ans, setAns] = useState<Record<string, Ans>>(initial);
  const [open, setOpen] = useState<string | null>(focus ?? factors.find(f => !initial[f.id]?.status)?.id ?? factors[0]?.id ?? null);
  const [sec, setSec] = useState<string>('all');
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const [q, setQ] = useState('');
  const [progress, setProgress] = useState(p0);
  const [saving, setSaving] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [, start] = useTransition();
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const answered = factors.filter(f => ans[f.id]?.status).length;
  const visible = useMemo(() => factors.filter(f => (sec === 'all' || f.section === sec) && (filter === 'all' || (filter === 'done' ? !!ans[f.id]?.status : !ans[f.id]?.status)) && (!q || (f.name + f.question + f.id).includes(q))), [factors, sec, filter, q, ans]);

  useEffect(() => { if (open) document.getElementById('q-' + open)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [open]);

  function persist(fid: string, patch: Partial<Ans>, delay = 0) {
    setAns(s => ({ ...s, [fid]: { ...(s[fid] ?? { status: null, selfLevel: null, answer: '' }), ...patch } }));
    if (!editable) return;
    clearTimeout(timers.current[fid]);
    const run = () => { setSaving(s => ({ ...s, [fid]: 'saving' })); start(async () => {
      try { const r = await saveAnswer(assessmentId, fid, patch); setProgress(r.progress); setSaving(s => ({ ...s, [fid]: 'saved' })); }
      catch { setSaving(s => ({ ...s, [fid]: 'error' })); }
    }); };
    if (delay) timers.current[fid] = setTimeout(run, delay); else run();
  }
  const idx = (fid: string) => visible.findIndex(f => f.id === fid);
  const go = (fid: string, d: 1 | -1) => { const i = idx(fid) + d; if (visible[i]) setOpen(visible[i].id); };
  const anySaving = Object.values(saving).includes('saving');

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_1fr]">
      <aside className="space-y-3 lg:sticky lg:top-24 lg:h-fit">
        <div className="card p-5">
          <div className="flex items-end justify-between"><div><div className="text-xs text-muted">أُجيب عن</div><div className="font-display text-3xl font-black num">{answered}<span className="text-base text-muted"> / {factors.length}</span></div></div>
            <div className={cn('flex items-center gap-1.5 text-xs', anySaving ? 'text-amber-700' : 'text-forest-700')}>{anySaving ? <><Loader2 className="size-3.5 animate-spin" /> يحفظ…</> : <><CloudCheck className="size-4" /> حفظ تلقائي</>}</div></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest-100"><motion.div className="spectrum-rtl h-full" animate={{ width: `${(answered / factors.length) * 100}%` }} /></div>
          <div className="mt-2 text-xs text-muted">اكتمال الملف الكلي <span className="num font-semibold text-ink">{progress}٪</span> · المطلوب للإرسال 70٪ من الأسئلة</div>
        </div>
        <nav className="card p-2">
          {[{ key: 'all', title: 'كل الأسئلة' }, ...sections].map(s => {
            const I = s.key === 'all' ? CircleDashed : SEC_ICON[s.key] ?? CircleDashed;
            const fs = s.key === 'all' ? factors : factors.filter(f => f.section === s.key); const d = fs.filter(f => ans[f.id]?.status).length;
            return (
              <button key={s.key} onClick={() => setSec(s.key)} className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm transition', sec === s.key ? 'bg-forest-800 text-white' : 'hover:bg-forest-50')}>
                <I className="size-4 shrink-0" /><span className="flex-1 font-semibold">{s.title}</span>
                <span className={cn('num text-xs', sec === s.key ? 'text-lime-brand' : d === fs.length ? 'text-forest-700' : 'text-muted')}>{d}/{fs.length}</span>
              </button>
            );
          })}
        </nav>
        <div className="card space-y-2 p-4 text-xs leading-5 text-muted">
          <div className="flex items-center gap-1.5 font-semibold text-ink"><Lightbulb className="size-4 text-amber-brand" /> نصيحة</div>
          اختر الحالة الأقرب للواقع، ثم المستوى الذي تراه لجهتك، واكتب الأرقام ومصادرها. الخبير المراجع يعتمد على الأدلة المرفوعة لا على الإجابة وحدها.
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        {!editable && <div className="flex items-center gap-2 rounded-2xl bg-slate-100 p-4 text-sm text-slate-700"><Lock className="size-4" /> الإجابات للعرض فقط في حالة الطلب الحالية.</div>}
        <div className="card flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-52 flex-1"><Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث في الأسئلة أو برمز المعيار F001" className="input h-10 pr-9" /></div>
          <div className="flex rounded-xl bg-forest-50 p-1 text-sm">
            {([['all', 'الكل'], ['todo', 'بلا إجابة'], ['done', 'مُجاب']] as const).map(([k, t]) => <button key={k} onClick={() => setFilter(k)} className={cn('rounded-lg px-3 py-1.5 font-semibold', filter === k ? 'bg-white shadow-sm' : 'text-muted')}>{t}</button>)}
          </div>
        </div>
        {sec !== 'all' && <div className="px-1 text-sm text-muted">{sections.find(s => s.key === sec)?.desc}</div>}

        {visible.map((f, i) => {
          const a = ans[f.id]; const isOpen = open === f.id; const st = STATUS_OPTS.find(o => o.v === a?.status); const sv = saving[f.id];
          return (
            <div key={f.id} id={'q-' + f.id} className={cn('card scroll-mt-24 overflow-hidden transition', isOpen && 'ring-2 ring-forest-600')}>
              <button onClick={() => setOpen(isOpen ? null : f.id)} className="flex w-full items-center gap-4 p-4 text-right md:p-5">
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold num', a?.status ? 'bg-forest-700 text-white' : 'bg-forest-50 text-forest-700')}>{a?.status ? <Check className="size-5" /> : factors.indexOf(f) + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="ltr rounded bg-forest-50 px-1.5 text-[11px] font-semibold text-forest-700">{f.id}</span><span className="text-[11px] text-muted">{f.group}</span>{f.group === 'بوابة' && <span className="rounded-full bg-orange-50 px-2 text-[11px] font-bold text-orange-brand">شرط أساسي</span>}</div>
                  <div className="mt-0.5 font-semibold leading-6">{f.name}</div>
                </div>
                {st && <span className="hidden rounded-full bg-forest-50 px-2.5 py-1 text-xs font-semibold text-forest-800 sm:inline">{st.t}{a?.selfLevel != null ? ` · ${a.selfLevel}` : ''}</span>}
                {sv === 'saving' ? <Loader2 className="size-4 animate-spin text-amber-600" /> : sv === 'saved' ? <CheckCircle2 className="size-4 text-forest-600" /> : null}
                <ChevronDown className={cn('size-5 shrink-0 text-muted transition', isOpen && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25 }} className="overflow-hidden">
                    <div className="space-y-6 border-t border-line p-5 md:p-7">
                      <div>
                        <div className="font-display text-xl font-semibold leading-9 text-forest-950">{f.question}</div>
                        {f.definition && <details className="group mt-3 rounded-xl bg-forest-50/70 p-4 text-sm leading-7"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-forest-800"><Info className="size-4" /> ما المقصود بهذا المعيار؟</summary><p className="mt-2 text-ink-2">{f.definition}</p></details>}
                      </div>
                      {f.asks.length > 0 && <div><div className="mb-2 text-sm font-semibold">ما الذي سيسأل عنه الخبير المراجع</div><ul className="grid gap-2 md:grid-cols-2">{f.asks.map((x, k) => <li key={k} className="flex gap-2 rounded-xl border border-line p-3 text-sm leading-6"><span className="mt-1 size-1.5 shrink-0 rounded-full bg-forest-500" />{x}</li>)}</ul></div>}

                      <div><div className="mb-2 text-sm font-semibold">1. ما وضع جهتكم في هذا المعيار؟</div>
                        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{STATUS_OPTS.map(o => <button key={o.v} disabled={!editable} data-on={a?.status === o.v} onClick={() => persist(f.id, { status: o.v })} className={cn('rounded-xl border border-line bg-white px-3 py-3 text-sm font-semibold transition hover:border-forest-400 disabled:opacity-60 data-[on=true]:border-transparent data-[on=true]:shadow-md', o.cls)}>{o.t}</button>)}</div>
                      </div>

                      {a?.status !== 'NA' && <div><div className="mb-2 text-sm font-semibold">2. أي وصف ينطبق على جهتكم؟ <span className="font-normal text-muted">(تقدير ذاتي يسترشد به الخبير المراجع)</span></div>
                        <div className="space-y-2">{f.levels.map((d, lv) => { const on = a?.selfLevel === lv; return (
                          <button key={lv} disabled={!editable} onClick={() => persist(f.id, { selfLevel: lv, status: a?.status ?? (lv >= 3 ? 'YES' : lv >= 1 ? 'PARTIAL' : 'NONE') })} className={cn('flex w-full items-start gap-3 rounded-xl border p-3 text-right text-sm leading-6 transition disabled:opacity-60', on ? 'border-forest-700 bg-forest-50 ring-1 ring-forest-700' : 'border-line hover:border-forest-300')}>
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg font-bold num" style={{ background: LV[lv], color: lv >= 3 ? '#fff' : '#1E2A23' }}>{lv}</span>
                            <span className="flex-1"><span className="font-semibold">{LVN[lv]}: </span>{d}</span>
                            {on && <Check className="mt-1 size-4 text-forest-700" />}
                          </button>); })}</div>
                      </div>}

                      <div><div className="mb-2 text-sm font-semibold">3. صف ما لديكم باختصار</div>
                        <textarea disabled={!editable} value={a?.answer ?? ''} onChange={e => persist(f.id, { answer: e.target.value }, 900)} rows={4} placeholder="مثال: نقيس النتيجة لبرنامج التمكين الاقتصادي: 412 ملتحقاً، توظف منهم 186 خلال 6 أشهر، والمصدر سجل المتابعة الهاتفية…" className="input min-h-28 py-3 leading-7" />
                        <div className="mt-1 flex justify-between text-xs text-muted"><span>اذكر الأرقام ومصدرها والفترة</span><span className="num">{(a?.answer ?? '').length}</span></div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-amber-50/70 p-4 text-sm"><div className="mb-2 flex items-center gap-1.5 font-semibold text-amber-900"><FileText className="size-4" /> أدلة مقبولة</div><ul className="space-y-1 leading-6 text-amber-950/80">{f.evidence.map((e, k) => <li key={k}>• {e}</li>)}</ul></div>
                        <div className="rounded-xl bg-forest-50 p-4 text-sm"><div className="mb-2 font-semibold text-forest-900">الملفات المرتبطة في المنصة</div>{f.docs.length ? <ul className="space-y-1 leading-6">{f.docs.map(d => <li key={d}>• {d}</li>)}</ul> : <p className="text-muted">ارفع أي دليل داعم في «ملفات أخرى».</p>}<Link href={`/portal/assessments/${assessmentId}/documents`} className="mt-2 inline-block font-semibold text-forest-700 hover:underline">اذهب لرفع الملفات ←</Link></div>
                      </div>

                      <div className="flex items-center justify-between border-t border-line pt-4">
                        <button onClick={() => go(f.id, -1)} disabled={idx(f.id) <= 0} className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink disabled:opacity-30"><ArrowRight className="size-4" /> السابق</button>
                        <span className="text-xs text-muted num">{idx(f.id) + 1} / {visible.length}</span>
                        <button onClick={() => { const nx = visible.slice(idx(f.id) + 1).find(x => !ans[x.id]?.status) ?? visible[idx(f.id) + 1]; if (nx) setOpen(nx.id); }} className="flex items-center gap-1.5 rounded-xl bg-forest-800 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700">التالي <ArrowLeft className="size-4" /></button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
        {!visible.length && <div className="card p-10 text-center text-muted">لا أسئلة مطابقة.</div>}
      </div>
    </div>
  );
}
