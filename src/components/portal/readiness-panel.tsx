import Link from 'next/link';
import { Check, CircleAlert, FileWarning, ListChecks } from 'lucide-react';
import { Card, CardTitle, Progress } from '@/components/ui';
import type { recomputeProgress } from '@/lib/workflow';

type P = Awaited<ReturnType<typeof recomputeProgress>>;

/** قائمة جاهزية الملف قبل الإرسال للمراجعة — محسوبة بقواعد واضحة من الإجابات والملفات الأساسية */
export function ReadinessPanel({ p, base, openRequests = 0, limit }: { p: P; base: string; openRequests?: number; limit?: number }) {
  const need = Math.ceil(p.total * 0.7);
  const items: { title: string; why: string; href: string; priority: 'عالية' | 'متوسطة' }[] = [
    ...p.missingDocs.map(d => ({ title: `ملف مطلوب: ${d.title}`, why: d.description ?? 'ملف أساسي لمسارك الحجمي', href: `${base}/documents`, priority: 'عالية' as const })),
    ...(p.answered < p.total ? [{ title: `${p.total - p.answered} معياراً بلا إجابة`, why: p.answered < need ? `أجب عن ${need - p.answered} على الأقل لتتمكن من الإرسال؛ والمعيار بلا إجابة يُقدّر بالمستوى 0.` : 'كل معيار بلا إجابة أو دليل يُقدّر بالمستوى 0، فأكمل ما تستطيعه ليعكس التقييم واقعك.', href: `${base}/questions`, priority: (p.answered < need ? 'عالية' : 'متوسطة') as 'عالية' | 'متوسطة' }] : []),
    ...(openRequests ? [{ title: `${openRequests} استيضاحات بانتظار ردك`, why: 'يتوقف استكمال المراجعة على ردك.', href: `${base}/requests`, priority: 'عالية' as const }] : []),
  ];
  const list = limit ? items.slice(0, limit) : items;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-gradient-to-l from-forest-50 to-white p-5">
        <CardTitle icon={<ListChecks className="size-5" />} title="ما الذي ينقص ملفك؟" subtitle="قائمة جاهزية محدّثة تلقائياً من إجاباتك وملفاتك" />
        <div className="text-left"><div className="font-display text-3xl font-black num text-forest-800">{p.progress}<span className="text-lg">٪</span></div><div className="text-xs text-muted">اكتمال الملف</div></div>
      </div>
      <div className="p-5">
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div><div className="mb-1 flex justify-between text-sm"><span>الأسئلة</span><span className="num font-semibold">{p.answered}/{p.total}</span></div><Progress value={(p.answered / p.total) * 100} /></div>
          <div><div className="mb-1 flex justify-between text-sm"><span>الملفات الأساسية</span><span className="num font-semibold">{p.docsDone}/{p.docsTotal}</span></div><Progress value={p.docsTotal ? (p.docsDone / p.docsTotal) * 100 : 100} /></div>
        </div>
        {list.length ? (
          <ul className="space-y-2.5">
            {list.map((m, i) => (
              <li key={i}><Link href={m.href} className="flex gap-3 rounded-xl border border-line p-3 transition hover:border-forest-400">
                {m.title.startsWith('ملف') ? <FileWarning className="mt-0.5 size-5 shrink-0 text-forest-700" /> : <CircleAlert className="mt-0.5 size-5 shrink-0 text-forest-700" />}
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{m.title}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${m.priority === 'عالية' ? 'bg-orange-brand text-white' : 'bg-amber-100 text-amber-900'}`}>{m.priority}</span></div><div className="mt-0.5 text-sm text-muted">{m.why}</div></div>
              </Link></li>
            ))}
          </ul>
        ) : <div className="flex items-center gap-2 rounded-xl bg-forest-50 p-4 text-sm font-semibold text-forest-800"><Check className="size-5" /> لا نواقص ظاهرة. ملفك جاهز للإرسال.</div>}
        {limit && items.length > limit && <div className="mt-3 text-xs text-muted">و{items.length - limit} بنداً آخر.</div>}
      </div>
    </Card>
  );
}
