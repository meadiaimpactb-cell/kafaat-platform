import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { PAGE_SIZE, withParams, type SP } from '@/lib/list-query';
import { cn } from '@/lib/cn';

/** شريط بحث وفلاتر (نموذج GET): يحافظ على الحالة في الرابط فيُشارَك ويُحفظ */
export function FilterBar({ q, qPlaceholder, children, sp, base }: { q?: string; qPlaceholder: string; children?: ReactNode; sp: SP; base: string }) {
  const active = Object.entries(sp).some(([k, v]) => v && k !== 'page' && k !== 'sort');
  return (
    <form className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-3 ring-1 ring-line">
      <label className="relative min-w-[16rem] flex-1"><Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><input name="q" defaultValue={q} placeholder={qPlaceholder} className="input h-10 w-full pr-9" /></label>
      {children}
      {sp.sort && <input type="hidden" name="sort" value={sp.sort} />}
      <button className="h-10 rounded-xl bg-forest-800 px-5 text-sm font-semibold text-white hover:bg-forest-900">بحث</button>
      {active && <Link href={base} className="flex h-10 items-center gap-1 rounded-xl px-3 text-sm text-muted hover:bg-forest-50"><X className="size-4" /> مسح</Link>}
    </form>
  );
}
export function Select({ name, label, value, options }: { name: string; label: string; value?: string; options: [string, string][] }) {
  return <label className="block"><span className="mb-1 block text-xs text-muted">{label}</span><select name={name} defaultValue={value ?? ''} className="input h-10 min-w-36">{[['', 'الكل'] as [string, string], ...options].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>;
}
/** تبويبات سريعة بعدّاد */
export function Facets({ items, param, sp, base }: { items: { value: string; label: string; count?: number }[]; param: string; sp: SP; base: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-line">
      {items.map(i => <Link key={i.value} href={withParams(base, sp, { [param]: i.value, page: '' })} className={cn('flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-semibold', (sp[param] ?? '') === i.value ? 'bg-forest-800 text-white' : 'text-ink-2 hover:bg-forest-50')}>{i.label}{i.count != null && <span className={cn('rounded-full px-1.5 text-[11px] num', (sp[param] ?? '') === i.value ? 'bg-white/20' : 'bg-forest-100 text-forest-800')}>{i.count}</span>}</Link>)}
    </div>
  );
}
export function Pager({ total, page, sp, base }: { total: number; page: number; sp: SP; base: string }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return <div className="mt-3 text-xs text-muted">{total} نتيجة</div>;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted">{total} نتيجة · صفحة <b className="num text-ink">{page}</b> من <b className="num text-ink">{pages}</b></span>
      <div className="flex gap-2">
        {page > 1 && <Link href={withParams(base, sp, { page: String(page - 1) })} className="flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 hover:border-forest-500"><ChevronRight className="size-4" /> السابق</Link>}
        {page < pages && <Link href={withParams(base, sp, { page: String(page + 1) })} className="flex items-center gap-1 rounded-xl border border-line bg-white px-3 py-1.5 hover:border-forest-500">التالي <ChevronLeft className="size-4" /></Link>}
      </div>
    </div>
  );
}
