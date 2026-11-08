import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/public-shell';
import { Button } from '@/components/ui';

export const metadata = { title: 'التحقق من شهادة' };
async function go(fd: FormData) { 'use server'; const c = String(fd.get('code') ?? '').trim().toUpperCase().replace(/\s/g, ''); if (c) redirect(`/verify/${encodeURIComponent(c)}`); }
export default function Page() {
  return (
    <div className="flex min-h-screen flex-col"><PublicHeader />
      <main className="mx-auto grid w-full max-w-xl flex-1 place-items-center px-5 py-16">
        <div className="w-full text-center">
          <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-forest-950 text-lime-brand"><ShieldCheck className="size-8" /></div>
          <h1 className="font-display text-3xl font-bold">التحقق من شهادة كفاءة الأثر</h1>
          <p className="mt-2 text-muted">أدخل رمز التحقق المطبوع أسفل رمز QR في الشهادة.</p>
          <form action={go} className="mt-8 flex gap-2"><input name="code" className="input ltr h-13 flex-1 text-center font-mono text-lg uppercase tracking-[.3em]" placeholder="XXXXXXXXXX" /><Button size="lg">تحقق</Button></form>
        </div>
      </main><PublicFooter /></div>
  );
}
