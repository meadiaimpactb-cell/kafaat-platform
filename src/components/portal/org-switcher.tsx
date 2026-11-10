import Link from 'next/link';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { switchOrg } from '@/app/actions/org';
import type { SessionUser } from '@/lib/auth';

/** تبديل الجهة النشطة: حساب واحد يدير عدة جهات */
export function OrgSwitcher({ user }: { user: SessionUser }) {
  if (!user.orgs.length) return <Link href="/portal/onboarding" className="mx-4 mb-4 flex items-center gap-2 rounded-xl bg-lime-brand px-3 py-2.5 text-sm font-semibold text-forest-950"><Plus className="size-4" /> أضف جهتك للبدء</Link>;
  return (
    <details className="group relative mx-4 mb-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2.5 text-sm text-white hover:bg-white/10">
        <Building2 className="size-4 shrink-0 text-lime-brand" /><span className="min-w-0 flex-1 truncate font-semibold">{user.org?.name}</span><ChevronsUpDown className="size-4 shrink-0 text-white/50" />
      </summary>
      <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl bg-white text-ink shadow-xl ring-1 ring-line">
        <div className="max-h-64 overflow-y-auto py-1">
          {user.orgs.map(o => (
            <form key={o.id} action={switchOrg.bind(null, o.id)}>
              <button className="flex w-full items-center gap-2 px-3 py-2.5 text-right text-sm hover:bg-forest-50"><span className="min-w-0 flex-1 truncate">{o.name}</span>{o.id === user.orgId && <Check className="size-4 text-forest-700" />}</button>
            </form>
          ))}
        </div>
        <div className="border-t border-line p-1"><Link href="/portal/onboarding?new=1" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-forest-800 hover:bg-forest-50"><Plus className="size-4" /> إضافة جهة أخرى</Link><Link href="/portal/organizations" className="block rounded-lg px-3 py-2 text-sm text-muted hover:bg-forest-50">إدارة الجهات</Link></div>
      </div>
    </details>
  );
}
