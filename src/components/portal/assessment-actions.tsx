'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, RefreshCw, Send, Sparkles, FileWarning, MessageCircleQuestion, ShieldAlert } from 'lucide-react';
import { submitAssessment, runGapAnalysis } from '@/app/actions/org';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { GapAnalysis } from '@/lib/ai';

export function SubmitAssessmentButton({ id, ready, resubmit }: { id: string; ready: boolean; resubmit?: boolean }) {
  const [pending, start] = useTransition(); const [err, setErr] = useState(''); const router = useRouter();
  return (
    <div className="space-y-2">
      <Button size="lg" variant={ready ? 'lime' : 'outline'} className="w-full" disabled={pending} onClick={() => start(async () => {
        setErr(''); const r = await submitAssessment(id);
        if (r && 'error' in r && r.error) setErr(r.error); else router.refresh();
      })}>{pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}{resubmit ? 'إعادة الإرسال للمقيّم' : 'إرسال الملف للمراجعة'}</Button>
      {err && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
    </div>
  );
}

const KIND_ICON = { 'ملف': FileWarning, 'إجابة': MessageCircleQuestion, 'جودة': ShieldAlert } as const;
const PRI = { 'عالية': 'bg-orange-brand text-white', 'متوسطة': 'bg-amber-100 text-amber-900', 'منخفضة': 'bg-slate-100 text-slate-700' } as const;

export function GapPanel({ id, initial, canRun = true, aiLive, limit }: { id: string; initial: GapAnalysis | null; canRun?: boolean; aiLive: boolean; limit?: number }) {
  const [g, setG] = useState<GapAnalysis | null>(initial); const [pending, start] = useTransition(); const router = useRouter();
  const list = g ? (limit ? g.missing.slice(0, limit) : g.missing) : [];
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-l from-forest-50 to-white p-5">
        <div className="flex items-center gap-3">
          <div className="relative grid size-11 place-items-center rounded-xl bg-forest-950 text-lime-brand"><Bot className="size-5" />{pending && <span className="absolute inset-0 rounded-xl ring-2 ring-lime-brand animate-pulse-ring" />}</div>
          <div><div className="font-display font-semibold">المساعد الذكي: ما الذي ينقص ملفك؟</div><div className="text-xs text-muted">{aiLive ? 'تحليل بواسطة Claude لملفاتك وإجاباتك' : 'تحليل بالقواعد (فعّل Claude من لوحة التحكم لتحليل أعمق)'}{g ? ` · آخر تحليل ${new Date(g.at).toLocaleString('ar-SA-u-ca-gregory-nu-latn', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}</div></div>
        </div>
        {canRun && <Button size="sm" variant={g ? 'outline' : 'primary'} disabled={pending} onClick={() => start(async () => { const r = await runGapAnalysis(id); setG(r); router.refresh(); })}>
          {pending ? <><Loader2 className="size-4 animate-spin" /> جارٍ التحليل…</> : g ? <><RefreshCw className="size-4" /> تحديث التحليل</> : <><Sparkles className="size-4" /> حلّل ملفي الآن</>}
        </Button>}
      </div>
      {g ? (
        <div className="grid gap-0 md:grid-cols-[13rem_1fr]">
          <div className="flex flex-col items-center justify-center gap-2 border-b border-line p-6 md:border-b-0 md:border-l">
            <div className="font-display text-5xl font-black num text-forest-800">{g.readiness}<span className="text-2xl">٪</span></div>
            <div className="text-xs text-muted">الجاهزية للمراجعة</div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-forest-100"><div className="spectrum-rtl h-full" style={{ width: `${g.readiness}%` }} /></div>
          </div>
          <div className="p-5">
            <p className="mb-4 text-sm leading-7 text-ink-2">{g.summary}</p>
            {list.length ? (
              <ul className="space-y-2.5">
                {list.map((m, i) => { const I = KIND_ICON[m.kind] ?? FileWarning; return (
                  <li key={i} className="flex gap-3 rounded-xl border border-line p-3">
                    <I className="mt-0.5 size-5 shrink-0 text-forest-700" />
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{m.title}</span><span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', PRI[m.priority])}>{m.priority}</span>{m.factorIds.slice(0, 4).map(f => <span key={f} className="ltr rounded bg-forest-50 px-1.5 text-[11px] text-forest-700">{f}</span>)}</div><div className="mt-0.5 text-sm text-muted">{m.why}</div></div>
                  </li>
                ); })}
              </ul>
            ) : <div className="rounded-xl bg-forest-50 p-4 text-sm text-forest-800">لا نواقص ظاهرة. ملفك جاهز للإرسال.</div>}
            {limit && g.missing.length > limit && <div className="mt-3 text-xs text-muted">و{g.missing.length - limit} ملاحظات أخرى في صفحة الملفات.</div>}
            {g.nextSteps?.length > 0 && <div className="mt-4 rounded-xl bg-lime-100/70 p-4"><div className="mb-1.5 text-sm font-semibold text-forest-900">الخطوات التالية</div><ol className="list-inside list-decimal space-y-1 text-sm text-forest-900">{g.nextSteps.map((s, i) => <li key={i}>{s}</li>)}</ol></div>}
          </div>
        </div>
      ) : <div className="p-8 text-center text-sm text-muted">ارفع ملفاتك وأجب عن الأسئلة، ثم اضغط «حلّل ملفي الآن» ليخبرك المساعد بما ينقص بدقة.</div>}
    </div>
  );
}
