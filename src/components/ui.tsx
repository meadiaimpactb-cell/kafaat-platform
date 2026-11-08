import Link from 'next/link';
import type { ReactNode, ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { CERT_SCALE, LEVEL_SCALE } from '@/lib/domain';

// ---------------------------------------------------------------- أزرار
const BTN = {
  base: 'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-500/20 active:scale-[.98]',
  v: {
    primary: 'bg-forest-800 text-white hover:bg-forest-700 shadow-[0_8px_20px_-10px_rgb(11_82_51/.7)]',
    lime: 'bg-lime-brand text-forest-950 hover:brightness-95 shadow-[0_8px_20px_-10px_rgb(150_160_20/.8)]',
    outline: 'border border-line bg-white text-ink hover:border-forest-500 hover:text-forest-800',
    ghost: 'text-ink-2 hover:bg-forest-100 hover:text-forest-800',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    dark: 'bg-forest-950 text-white hover:bg-forest-900',
  },
  s: { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-[.95rem]', lg: 'h-13 px-7 text-base' },
};
type BtnProps = { variant?: keyof typeof BTN.v; size?: keyof typeof BTN.s };
export function Button({ variant = 'primary', size = 'md', className, ...p }: ComponentProps<'button'> & BtnProps) {
  return <button {...p} className={cn(BTN.base, BTN.v[variant], BTN.s[size], className)} />;
}
export function ButtonLink({ variant = 'primary', size = 'md', className, ...p }: ComponentProps<typeof Link> & BtnProps) {
  return <Link {...p} className={cn(BTN.base, BTN.v[variant], BTN.s[size], className)} />;
}

// ---------------------------------------------------------------- بطاقات وشارات
export function Card({ className, children, ...p }: ComponentProps<'div'>) {
  return <div {...p} className={cn('card', className)}>{children}</div>;
}
export function CardTitle({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 grid size-9 place-items-center rounded-xl bg-forest-100 text-forest-800">{icon}</div>}
        <div><h3 className="font-display text-[1.05rem] font-semibold text-ink">{title}</h3>{subtitle && <p className="text-sm text-muted mt-0.5">{subtitle}</p>}</div>
      </div>
      {action}
    </div>
  );
}
const TONES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200', amber: 'bg-amber-50 text-amber-800 ring-amber-200', sky: 'bg-sky-50 text-sky-800 ring-sky-200',
  violet: 'bg-violet-50 text-violet-800 ring-violet-200', orange: 'bg-orange-50 text-orange-800 ring-orange-200', lime: 'bg-lime-50 text-lime-900 ring-lime-300',
  teal: 'bg-teal-50 text-teal-800 ring-teal-200', green: 'bg-forest-100 text-forest-800 ring-forest-300', rose: 'bg-rose-50 text-rose-700 ring-rose-200',
};
export function Badge({ tone = 'slate', children, className, dot }: { tone?: string; children: ReactNode; className?: string; dot?: boolean }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset whitespace-nowrap', TONES[tone] ?? TONES.slate, className)}>{dot && <span className="size-1.5 rounded-full bg-current" />}{children}</span>;
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 animate-rise">
      <div>
        {eyebrow && <div className="mb-1.5 text-xs font-semibold tracking-wide text-forest-600">{eyebrow}</div>}
        <h1 className="font-display text-2xl md:text-[1.75rem] font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-3xl text-[.95rem] text-muted leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, hint, icon, tone = 'forest', className }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: 'forest' | 'lime' | 'amber' | 'orange' | 'dark'; className?: string }) {
  const t = { forest: 'bg-forest-100 text-forest-800', lime: 'bg-lime-100 text-lime-900', amber: 'bg-amber-50 text-amber-700', orange: 'bg-orange-50 text-orange-700', dark: 'bg-forest-900 text-lime-brand' }[tone];
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="text-sm text-muted">{label}</div>
        {icon && <div className={cn('grid size-9 place-items-center rounded-xl', t)}>{icon}</div>}
      </div>
      <div className="mt-2 font-display text-[1.75rem] font-bold num text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  );
}

export function Progress({ value, className, tone = 'forest' }: { value: number; className?: string; tone?: 'forest' | 'spectrum' }) {
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-forest-100', className)}>
      <div className={cn('h-full rounded-full transition-all duration-700', tone === 'spectrum' ? 'spectrum-rtl' : 'bg-gradient-to-l from-forest-500 to-forest-800')} style={{ width: `${Math.max(2, Math.min(100, value))}%`, marginInlineStart: 0 }} />
    </div>
  );
}

export function Ring({ value, size = 120, stroke = 11, label, sub, color = '#0B5233' }: { value: number; size?: number; stroke?: number; label?: ReactNode; sub?: ReactNode; color?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E6EEE2" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-2xl font-bold num">{label ?? `${Math.round(value)}٪`}</div>
        {sub && <div className="text-[11px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-forest-300 bg-forest-50/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-white text-forest-700 shadow-sm">{icon}</div>}
      <div className="font-display font-semibold">{title}</div>
      {text && <p className="mt-1 max-w-md text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return <label className={cn('block', className)}><span className="label">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}</label>;
}

export function Table({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-line bg-white', className)}>
      <table className="w-full text-sm">
        <thead><tr className="bg-forest-50 text-ink-2">{head.map((h, i) => <th key={i} className="px-4 py-3 text-right font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>;

export function Avatar({ name, className }: { name: string; className?: string }) {
  const init = name.replace(/^(د\.|م\.)\s*/, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join(' ');
  return <div className={cn('grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-forest-600 to-forest-900 text-[13px] font-bold text-white', className)}>{init}</div>;
}

// ---------------------------------------------------------------- مستويات العوامل
export function LevelChip({ level, size = 'md' }: { level: number | null | undefined; size?: 'sm' | 'md' }) {
  if (level == null) return <span className={cn('inline-grid place-items-center rounded-lg border border-dashed border-line text-muted', size === 'sm' ? 'size-7 text-xs' : 'size-9 text-sm')}>—</span>;
  const L = LEVEL_SCALE[level];
  return <span title={L.name} className={cn('inline-grid place-items-center rounded-lg font-bold num', size === 'sm' ? 'size-7 text-xs' : 'size-9 text-sm')} style={{ background: L.color, color: L.text }}>{level}</span>;
}

// ---------------------------------------------------------------- بطاقة الكفاءة (التوقيع البصري للمنصة)
export function EfficiencyLabel({ level, score, compact, qualified = true }: { level?: string | null; score?: number | null; compact?: boolean; qualified?: boolean }) {
  return (
    <div className={cn('select-none', compact ? 'space-y-1' : 'space-y-1.5')}>
      {CERT_SCALE.map((s, i) => {
        const active = qualified && s.key === level;
        const w = 46 + i * 13.5;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div className="relative flex items-center" style={{ width: `${w}%` }}>
              <div className={cn('flex w-full items-center justify-between rounded-s-md px-3 text-white font-bold', compact ? 'h-7 text-xs' : 'h-9 text-sm', active ? 'ring-2 ring-offset-2 ring-forest-950' : 'opacity-[.92]')}
                style={{ background: s.color, clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)' }}>
                <span className="font-display">{s.key}</span><span className="ltr me-3 opacity-90">{s.min}+</span>
              </div>
            </div>
            {active && score != null && (
              <div className="flex items-center gap-1 animate-rise">
                <div className="size-0 border-y-[10px] border-e-[12px] border-y-transparent border-e-forest-950" />
                <div className={cn('rounded-md bg-forest-950 px-2.5 font-display font-bold text-white num', compact ? 'py-0.5 text-sm' : 'py-1 text-base')}>{score.toFixed(1)}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LevelBadge({ level }: { level?: string | null }) {
  const s = CERT_SCALE.find(x => x.key === level);
  if (!s) return <Badge tone="orange">{level ?? '—'}</Badge>;
  return <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: s.color }}>{s.key}</span>;
}

export function Logo({ dark, className }: { dark?: boolean; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dark ? '/brand/logo-dark.png' : '/brand/logo.png'} alt="كفاءة الأثر" className={cn('h-11 w-auto', className)} />;
}
