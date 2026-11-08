import { asc, eq } from 'drizzle-orm';
import { ChevronDown } from 'lucide-react';
import { db, factors } from '@/db';
import { AXES, GATES, TRACK_REQ } from '@/lib/scoring';
import { SECTIONS, LEVEL_SCALE, CERT_SCALE } from '@/lib/domain';
import { PageHeader, Card, LevelChip } from './ui';

export async function MethodologyLibrary() {
  const fs = await db.select().from(factors).where(eq(factors.active, true)).orderBy(asc(factors.sortOrder));
  const nm = Object.fromEntries(fs.map(f => [f.id, f.name]));
  return (
    <div className="space-y-6">
      <PageHeader title="مكتبة العوامل والمنهجية" subtitle="56 عاملاً بمستويات من 0 إلى 4 · أربعة محاور بنقاط 30/30/30/10 · بوابات ومتطلبات مسار وسقوف." />
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(AXES).map(([k, a]) => <Card key={k} className="p-5"><div className="text-xs text-muted">المحور {k} · {a.pts} نقطة</div><div className="mt-1 font-semibold">{a.name}</div><div className="mt-2 text-xs text-muted">{a.ids.map(i => nm[i]).join('، ')}</div></Card>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><div className="mb-2 font-semibold">البوابات المانعة</div><ul className="space-y-1 text-sm">{Object.entries(GATES).map(([f, m]) => <li key={f}><b className="ltr">{f}</b> {nm[f]} ≥ {m}</li>)}</ul></Card>
        <Card className="p-5"><div className="mb-2 font-semibold">متطلبات المسار (ناشئ/متوسط/كبير)</div><ul className="space-y-1 text-sm">{Object.entries(TRACK_REQ).map(([f, m]) => <li key={f}><b className="ltr">{f}</b> {nm[f]}: <span className="num">{m.EMERGING}/{m.MEDIUM}/{m.LARGE}</span></li>)}</ul></Card>
        <Card className="p-5"><div className="mb-2 font-semibold">مستويات الشهادة</div><div className="flex flex-wrap gap-2">{CERT_SCALE.map(s => <span key={s.key} className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: s.color }}>{s.key} {s.min}+</span>)}</div><div className="mt-3 text-xs text-muted">معامل التصميم Fd = 0.70 + 0.30 × (F049 + F057) ÷ 8 · معامل الانتقاء Fs حسب F106: 0.90/0.95/1.00</div></Card>
      </div>
      {SECTIONS.map(s => (
        <section key={s.key}>
          <h2 className="mb-3 font-display text-xl font-semibold">{s.title} <span className="text-sm font-normal text-muted">— {s.desc}</span></h2>
          <div className="space-y-2">
            {fs.filter(f => f.section === s.key).map(f => (
              <details key={f.id} className="card group overflow-hidden">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4"><span className="ltr w-12 text-xs font-bold text-forest-700">{f.id}</span><span className="flex-1 font-semibold">{f.name}</span><span className="text-xs text-muted">{f.group}{f.weight ? ` · ${f.weight}` : ''}</span><ChevronDown className="size-4 text-muted transition group-open:rotate-180" /></summary>
                <div className="space-y-4 border-t border-line p-5 text-sm leading-7">
                  <p className="font-display text-base">{f.question}</p>
                  {f.definition && <p className="text-ink-2">{f.definition}</p>}
                  {f.calc && <div className="rounded-xl bg-forest-50 p-3"><b>الاحتساب: </b>{f.calc}</div>}
                  <div className="space-y-1.5">{(f.levels as string[]).map((d, i) => <div key={i} className="flex gap-3"><LevelChip level={i} size="sm" /><span><b>{LEVEL_SCALE[i].name}: </b>{d}</span></div>)}</div>
                  {f.rule && <div className="rounded-xl bg-amber-50 p-3"><b>القاعدة: </b>{f.rule}</div>}
                  {(f.flags as string[] | null)?.length ? <div className="rounded-xl bg-rose-50 p-3"><b>علامات تحذير: </b>{(f.flags as string[]).join(' · ')}</div> : null}
                  <div><b>الأدلة: </b>{(f.evidence as string[]).join(' · ')}</div>
                  {f.example && <div className="text-muted"><b>مثال: </b>{f.example}</div>}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
