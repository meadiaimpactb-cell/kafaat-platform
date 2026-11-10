import { cn } from '@/lib/cn';
import type { ThreadItem } from '@/lib/messages';
import { fmtDate } from '@/lib/format';

export function MessageThread({ items, empty }: { items: ThreadItem[]; empty: string }) {
  if (!items.length) return <div className="grid place-items-center rounded-2xl border border-dashed border-line p-10 text-center text-sm text-muted">{empty}</div>;
  return (
    <ol className="space-y-3">
      {items.map(m => (
        <li key={m.id} className={cn('flex', m.mine ? 'justify-start' : 'justify-end')}>
          <div className={cn('max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm md:max-w-[70%]', m.mine ? 'rounded-tr-sm bg-forest-800 text-white' : m.from === 'STAFF' ? 'rounded-tl-sm bg-lime-100 text-forest-950 ring-1 ring-lime-300' : 'rounded-tl-sm bg-white text-ink ring-1 ring-line')}>
            <div className={cn('mb-1 text-[11px] font-semibold', m.mine ? 'text-white/65' : 'text-forest-700')}>{m.mine && m.label === 'أنتم' ? 'أنتم' : m.label}</div>
            <p className="whitespace-pre-wrap leading-7">{m.body}</p>
            <div className={cn('mt-1.5 text-[11px]', m.mine ? 'text-white/50' : 'text-muted')}>{fmtDate(m.at, true)}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
