import Link from 'next/link';
import { and, count, eq, isNull } from 'drizzle-orm';
import { Bell, LogOut, Menu, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { db, notifications } from '@/db';
import type { SessionUser } from '@/lib/auth';
import { ROLE_LABEL } from '@/lib/domain';
import { logoutAction } from '@/app/actions/auth';
import { Avatar } from './ui';
import { NavLinks, type NavItem } from './client/nav-links';

export async function AppShell({ user, nav, children, homeHref, notifHref, tone = 'dark', sidebarExtra, searchHref }: { user: SessionUser; nav: NavItem[]; children: ReactNode; homeHref: string; notifHref: string; tone?: 'dark' | 'light'; sidebarExtra?: ReactNode; searchHref?: string }) {
  const unread = (await db.select({ c: count() }).from(notifications).where(and(eq(notifications.userId, user.id), isNull(notifications.readAt))))[0].c;
  const dark = tone === 'dark';
  const sidebar = (
    <div className={`flex h-full flex-col ${dark ? 'bg-forest-950 text-white' : 'bg-white border-l border-line'}`}>
      <Link href={homeHref} className="flex items-center gap-3 px-6 pb-6 pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dark ? '/brand/logo-dark.png' : '/brand/logo.png'} alt="كفاءة الأثر" className="h-10 w-auto" />
      </Link>
      <div className={`mx-4 mb-4 rounded-2xl p-3.5 ${dark ? 'bg-white/[.06]' : 'bg-forest-50'}`}>
        <div className="flex items-center gap-3">
          <Avatar name={user.name} className={dark ? 'from-lime-brand to-forest-500 text-forest-950' : ''} />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{user.name}</div>
            <div className={`truncate text-xs ${dark ? 'text-white/55' : 'text-muted'}`}>{user.role === 'ORG_USER' ? (user.orgs.length > 1 ? `${user.orgs.length} جهات في حسابك` : user.org?.name ?? 'أضف جهتك') : ROLE_LABEL[user.role]}</div>
          </div>
        </div>
      </div>
      {sidebarExtra}
      <nav className="flex-1 overflow-y-auto px-3"><NavLinks items={nav} dark={dark} /></nav>
      <form action={logoutAction} className="p-4">
        <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${dark ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-muted hover:bg-forest-50'}`}><LogOut className="size-4" /> تسجيل الخروج</button>
      </form>
      <div className="spectrum h-1" />
    </div>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line/70 bg-paper/85 px-4 backdrop-blur md:px-8">
          <details className="relative lg:hidden">
            <summary className="grid size-10 cursor-pointer list-none place-items-center rounded-xl border border-line bg-white"><Menu className="size-5" /></summary>
            <div className="fixed inset-y-0 right-0 z-50 w-72 shadow-2xl">{sidebar}</div>
          </details>
          {searchHref ? (
            <form action={searchHref} className="relative hidden max-w-md flex-1 lg:block"><Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input name="q" placeholder="بحث شامل: جهة، طلب، ترخيص، دفعة…" className="input h-10 w-full pr-9" /></form>
          ) : <div className="hidden text-sm text-muted lg:block">{new Date().toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>}
          <div className="flex items-center gap-2">
            <Link href={notifHref} className="relative grid size-10 place-items-center rounded-xl border border-line bg-white text-ink-2 hover:border-forest-500">
              <Bell className="size-[18px]" />
              {unread > 0 && <span className="absolute -left-1 -top-1 grid min-w-5 place-items-center rounded-full bg-orange-brand px-1 text-[11px] font-bold text-white num">{unread}</span>}
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}
