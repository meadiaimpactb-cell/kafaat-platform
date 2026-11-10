'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, CloudUpload, Eye, FileText, Loader2, Trash2 } from 'lucide-react';
import { deleteOrgDoc } from '@/app/actions/org';
import { FileDrop } from '@/components/client/file-drop';
import { checkFile, UPLOAD_HINT } from '@/lib/upload-rules';
import { cn } from '@/lib/cn';

type Meta = Record<string, { label: string; hint: string; required: boolean }>;
type Doc = { id: string; kind: string; fileName: string; size: number; createdAt: string };
const size = (b: number) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} ك.ب` : `${(b / 1048576).toFixed(1)} م.ب`);

/** مستندات الجهة الأساسية: كل نوع له منطقة سحب وإفلات مستقلة مع رسائل خطأ واضحة */
export function OrgDocsPanel({ orgId, docs, meta, maxMb, locked }: { orgId: string; docs: Doc[]; meta: Meta; maxMb: number; locked?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<Record<string, string>>({});

  async function upload(kind: string, files: File[]) {
    setErr(e => ({ ...e, [kind]: '' }));
    for (const f of files) {
      const bad = checkFile(f, maxMb);
      if (bad) { setErr(e => ({ ...e, [kind]: `${f.name}: ${bad}` })); continue; }
      setBusy(kind);
      try {
        const fd = new FormData(); fd.append('file', f); fd.append('orgId', orgId); fd.append('kind', kind);
        const r = await fetch('/api/org-docs', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? 'تعذر رفع الملف');
      } catch (e) { setErr(x => ({ ...x, [kind]: `${f.name}: ${(e as Error).message}` })); }
    }
    setBusy(null); router.refresh();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Object.entries(meta).map(([kind, m]) => {
        const mine = docs.filter(d => d.kind === kind); const done = mine.length > 0;
        return (
          <FileDrop key={kind} disabled={locked} onFiles={f => upload(kind, f)} noClick
            className="card overflow-hidden transition" activeClassName="ring-2 ring-lime-brand" idleClassName="">
            {({ active, open }) => (
              <>
                <div className="flex items-start gap-3 p-4">
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', done ? 'bg-forest-700 text-white' : m.required ? 'bg-orange-50 text-orange-brand ring-1 ring-orange-200' : 'bg-forest-50 text-forest-600')}>{done ? <Check className="size-5" /> : <FileText className="size-5" />}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{m.label}</span>{m.required ? <span className="rounded-full bg-orange-brand/10 px-2 py-0.5 text-[11px] font-bold text-orange-brand">مطلوب</span> : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">اختياري</span>}</div>
                    <div className="mt-0.5 text-xs leading-5 text-muted">{m.hint}</div>
                  </div>
                  {!locked && <button type="button" onClick={open} disabled={busy === kind} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 py-1.5 text-sm font-semibold hover:border-forest-500">{busy === kind ? <Loader2 className="size-4 animate-spin" /> : <CloudUpload className="size-4" />} {done ? 'إضافة' : 'رفع'}</button>}
                </div>
                {active && <div className="bg-lime-100 py-2.5 text-center text-sm font-semibold text-forest-900">أفلت الملف هنا</div>}
                {!locked && !done && !active && <div className="mx-4 mb-4 rounded-xl border border-dashed border-line py-3 text-center text-xs text-muted">اسحب الملف وأفلته هنا · {UPLOAD_HINT} · حتى {maxMb} م.ب</div>}
                {err[kind] && <div className="mx-4 mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" /> {err[kind]}</div>}
                {mine.length > 0 && <ul className="divide-y divide-line border-t border-line bg-forest-50/30">{mine.map(d => (
                  <li key={d.id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{d.fileName}</span><span className="text-xs text-muted">{size(d.size)}</span>
                    <a href={`/api/org-docs/${d.id}`} target="_blank" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-forest-800" title="عرض"><Eye className="size-4" /></a>
                    {!locked && <button type="button" onClick={async () => { if (!window.confirm('حذف المستند؟')) return; await deleteOrgDoc(d.id); router.refresh(); }} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600" title="حذف"><Trash2 className="size-4" /></button>}
                  </li>
                ))}</ul>}
              </>
            )}
          </FileDrop>
        );
      })}
    </div>
  );
}
