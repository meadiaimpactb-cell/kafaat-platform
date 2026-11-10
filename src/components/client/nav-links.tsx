'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Award, Bell, BookOpen, Bot, Building2, ClipboardList, Circle, CreditCard, FileCog, Home, KeyRound, LayoutDashboard, Library, ListChecks, MapPin, Receipt, ScrollText, Settings, TicketPercent, Users, Wallet, BadgeCheck, Gauge, MessageSquare, Landmark, ShieldCheck, Mail, Search, CalendarClock } from 'lucide-react';
const ICONS = { Award, Bell, BookOpen, Bot, Building2, ClipboardList, CreditCard, FileCog, Home, KeyRound, LayoutDashboard, Library, ListChecks, MapPin, Receipt, ScrollText, Settings, TicketPercent, Users, Wallet, BadgeCheck, Gauge, MessageSquare, Landmark, ShieldCheck, Mail, Search, CalendarClock } as Record<string, typeof Circle>;
import { cn } from '@/lib/cn';

export type NavItem = { href: string; label: string; icon: string; badge?: number; section?: string; exact?: boolean };

export function NavLinks({ items, dark }: { items: NavItem[]; dark?: boolean }) {
  const path = usePathname();
  let lastSection: string | undefined;
  return (
    <ul className="space-y-1">
      {items.map(it => {
        const Icon = ICONS[it.icon] ?? Circle;
        const active = it.exact ? path === it.href : path === it.href || path.startsWith(it.href + '/');
        const head = it.section && it.section !== lastSection ? it.section : null; lastSection = it.section ?? lastSection;
        return (
          <li key={it.href}>
            {head && <div className={cn('px-3 pb-1.5 pt-4 text-[11px] font-semibold tracking-wide', dark ? 'text-white/35' : 'text-muted')}>{head}</div>}
            <Link href={it.href} className={cn('group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[.92rem] transition',
              dark ? (active ? 'bg-lime-brand text-forest-950 font-semibold' : 'text-white/75 hover:bg-white/[.06] hover:text-white') : (active ? 'bg-forest-800 text-white font-semibold' : 'text-ink-2 hover:bg-forest-50'))}>
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1">{it.label}</span>
              {!!it.badge && <span className={cn('rounded-full px-2 text-[11px] font-bold num', active ? 'bg-forest-950 text-lime-brand' : 'bg-orange-brand text-white')}>{it.badge}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
