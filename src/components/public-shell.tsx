import Link from 'next/link';
import { Logo, ButtonLink } from './ui';
import { currentUser, homeFor } from '@/lib/auth';

export async function PublicHeader({ dark }: { dark?: boolean }) {
  const u = await currentUser();
  return (
    <header className={dark ? 'absolute inset-x-0 top-0 z-30' : 'sticky top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur'}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
        <Link href="/" className="shrink-0"><Logo dark={dark} className="h-10" /></Link>
        <nav className={`hidden items-center gap-7 text-[.95rem] font-medium md:flex ${dark ? 'text-white/80' : 'text-ink-2'}`}>
          <Link href="/#how" className="hover:text-lime-brand">كيف يعمل</Link>
          <Link href="/#method" className="hover:text-lime-brand">المنهج</Link>
          <Link href="/#pricing" className="hover:text-lime-brand">الأسعار</Link>
          <Link href="/verify" className="hover:text-lime-brand">تحقق من شهادة</Link>
        </nav>
        <div className="flex items-center gap-2">
          {u ? <ButtonLink href={homeFor(u.role)} variant={dark ? 'lime' : 'primary'} size="sm">لوحتي</ButtonLink> : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className={dark ? 'text-white hover:bg-white/10 hover:text-white' : ''}>دخول</ButtonLink>
              <ButtonLink href="/register" variant={dark ? 'lime' : 'primary'} size="sm">ابدأ التقييم</ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo className="h-12" />
          <p className="mt-4 max-w-md text-sm leading-7 text-muted">منصة لتقييم كفاءة الأثر في الجهات غير الربحية: كم من الأثر الصافي الموثق يصنعه كل ريال، وبأي قوة دليل. مبنية على دراسة 132 عاملاً واعتمدت أوزانها ورش عمل مع أكثر من عشرة خبراء.</p>
        </div>
        <div>
          <div className="mb-3 font-display font-semibold">المنصة</div>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/#how" className="hover:text-forest-700">رحلة التقييم</Link></li>
            <li><Link href="/#pricing" className="hover:text-forest-700">الأسعار</Link></li>
            <li><Link href="/verify" className="hover:text-forest-700">التحقق من الشهادات</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 font-display font-semibold">الحساب</div>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/register" className="hover:text-forest-700">تسجيل جهة جديدة</Link></li>
            <li><Link href="/login" className="hover:text-forest-700">تسجيل الدخول</Link></li>
          </ul>
        </div>
      </div>
      <div className="spectrum h-1.5" />
      <div className="py-4 text-center text-xs text-muted">© {new Date().getFullYear()} كفاءة الأثر — قياسٌ أوثق، قرارٌ أذكى، وأثرٌ أبقى</div>
    </footer>
  );
}
