import { Check } from 'lucide-react';
import { JOURNEY, STATUS } from '@/lib/domain';
import type { AssessmentStatus } from '@/db/schema';
import { cn } from '@/lib/cn';

/** شريط رحلة التقييم بسبع مراحل */
export function JourneyTrack({ status, profileDone = true }: { status?: AssessmentStatus | null; profileDone?: boolean }) {
  const cur = !profileDone ? 1 : !status ? 2 : status === 'CERTIFIED' ? JOURNEY.length + 1 : STATUS[status].step;
  return (
    <div className="card overflow-hidden p-5 md:p-6">
      <div className="relative">
        <div className="absolute inset-x-6 top-[22px] hidden h-1 rounded-full bg-forest-100 md:block" />
        <div className="absolute right-6 top-[22px] hidden h-1 rounded-full spectrum-rtl transition-all duration-1000 md:block" style={{ width: `calc(${(Math.max(0, Math.min(cur, JOURNEY.length) - 1) / (JOURNEY.length - 1)) * 100}% - ${cur === 1 ? 0 : 48}px)` }} />
        <ol className="relative grid grid-cols-2 gap-y-5 sm:grid-cols-4 md:grid-cols-7">
          {JOURNEY.map(s => {
            const done = s.n < cur, active = s.n === cur;
            return (
              <li key={s.n} className="flex flex-col items-center text-center">
                <div className={cn('grid size-11 place-items-center rounded-full border-4 border-white font-display font-bold shadow-sm transition',
                  done ? 'bg-forest-700 text-white' : active ? 'bg-lime-brand text-forest-950 animate-pulse-ring' : 'bg-forest-50 text-muted')}>
                  {done ? <Check className="size-5" /> : s.n}
                </div>
                <div className={cn('mt-2.5 text-[.85rem] font-semibold', active ? 'text-forest-800' : done ? 'text-ink' : 'text-muted')}>{s.t}</div>
                <div className="mt-0.5 hidden px-1 text-[11px] leading-4 text-muted md:block">{s.d}</div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: AssessmentStatus }) {
  const s = STATUS[status];
  const t: Record<string, string> = { slate: 'bg-slate-100 text-slate-700', amber: 'bg-amber-50 text-amber-800', sky: 'bg-sky-50 text-sky-800', violet: 'bg-violet-50 text-violet-800', orange: 'bg-orange-50 text-orange-800', lime: 'bg-lime-100 text-lime-900', teal: 'bg-teal-50 text-teal-800', green: 'bg-forest-100 text-forest-800', rose: 'bg-rose-50 text-rose-700' };
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', t[s.tone])}><span className="size-1.5 rounded-full bg-current" />{s.label}</span>;
}
