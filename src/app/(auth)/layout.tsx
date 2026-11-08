import Link from 'next/link';
import { Logo, EfficiencyLabel } from '@/components/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 md:px-14">
        <Link href="/"><Logo className="h-11" /></Link>
        <div className="flex flex-1 items-center"><div className="w-full max-w-md py-10 animate-rise">{children}</div></div>
        <div className="text-xs text-muted">© {new Date().getFullYear()} كفاءة الأثر</div>
      </div>
      <div className="relative hidden overflow-hidden bg-mesh p-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-grid-dark" />
        <div className="relative max-w-lg">
          <div className="font-display text-4xl font-bold leading-tight">قِس ما يصنعه كل ريال من أثر</div>
          <p className="mt-5 leading-8 text-white/70">منصة كفاءة الأثر تمنح جهتك صورة صادقة عن أثرها وكلفته وقوة أدلته، وخريطة واضحة لما يرفع مستواها.</p>
        </div>
        <div className="relative max-w-md rounded-3xl bg-white p-6 text-ink shadow-2xl">
          <div className="mb-4 text-xs font-semibold text-forest-600">مستويات الشهادة</div>
          <EfficiencyLabel level="متقدم" score={71} compact />
        </div>
      </div>
    </div>
  );
}
