'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/cn';

export type TabItem = { href: string; label: string; count?: number; disabled?: boolean; exact?: boolean; tone?: 'orange' | 'forest' };
export function Tabs({ items }: { items: TabItem[] }) {
  const path = usePathname();
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <nav className="flex min-w-max gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-line">
        {items.map(t => {
          const active = t.exact ? path === t.href : path === t.href || path.startsWith(t.href + '/');
          if (t.disabled) return <span key={t.href} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm text-muted/60"><Lock className="size-3.5" />{t.label}</span>;
          return (
            <Link key={t.href} href={t.href} className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition', active ? 'bg-forest-800 text-white shadow-sm' : 'text-ink-2 hover:bg-forest-50')}>
              {t.label}
              {!!t.count && <span className={cn('grid min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold num', active ? 'bg-lime-brand text-forest-950' : t.tone === 'orange' ? 'bg-orange-brand text-white' : 'bg-forest-100 text-forest-800')}>{t.count}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
