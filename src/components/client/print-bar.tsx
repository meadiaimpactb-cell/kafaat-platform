'use client';
import { Printer, ArrowRight } from 'lucide-react';
export function PrintBar({ back, title }: { back?: string; title?: string }) {
  return (
    <div className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-white/90 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-3">{back && <a href={back} className="flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowRight className="size-4" /> رجوع</a>}<span className="font-semibold">{title}</span></div>
      <button onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-700"><Printer className="size-4" /> طباعة أو حفظ PDF</button>
    </div>
  );
}
