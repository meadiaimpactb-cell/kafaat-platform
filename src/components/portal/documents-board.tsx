'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check, CloudUpload, Eye, FileSpreadsheet, FileText, FileImage, Loader2, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import { deleteDocument } from '@/app/actions/org';
import { FileDrop } from '@/components/client/file-drop';
import { checkFile, UPLOAD_HINT } from '@/lib/upload-rules';
import { cn } from '@/lib/cn';

type Req = { id: string; code: string; title: string; description: string; required: boolean; factorIds: string[]; category: string };
type Doc = { id: string; requirementId: string | null; fileName: string; size: number; mimeType: string; createdAt: string };
type Job = { key: string; name: string; stage: 'upload' | 'done' | 'error'; error?: string };

const size = (b: number) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} ك.ب` : `${(b / 1048576).toFixed(1)} م.ب`);
const icon = (m: string) => (m.includes('sheet') || m.includes('excel') || m.includes('csv') ? FileSpreadsheet : m.startsWith('image/') ? FileImage : FileText);

export function DocumentsBoard({ assessmentId, editable, maxMb, cycleYear, reqs, docs }: { assessmentId: string; editable: boolean; maxMb: number; cycleYear: number; reqs: Req[]; docs: Doc[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const setJob = (key: string, p: Partial<Job>) => setJobs(js => js.map(j => (j.key === key ? { ...j, ...p } : j)));

  /** كل ملف يُتحقق منه بالامتداد والحجم مع رسالة واضحة عند الرفض، ثم يُرفع إلى الخادم */
  const upload = useCallback(async (files: File[], reqId: string | null) => {
    for (const file of files) {
      const key = Math.random().toString(36).slice(2);
      const bad = checkFile(file, maxMb);
      if (bad) { setJobs(js => [{ key, name: file.name, stage: 'error', error: bad }, ...js]); continue; }
      setJobs(js => [{ key, name: file.name, stage: 'upload' }, ...js]);
      const fd = new FormData(); fd.append('file', file); fd.append('assessmentId', assessmentId); if (reqId) fd.append('requirementId', reqId);
      try {
        const r = await fetch('/api/uploads', { method: 'POST', body: fd }); const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? 'تعذر رفع الملف');
        setJob(key, { stage: 'done' });
      } catch (e) { setJob(key, { stage: 'error', error: (e as Error).message }); }
      router.refresh();
    }
    setTimeout(() => setJobs(js => js.filter(j => j.stage !== 'done')), 4000);
  }, [assessmentId, maxMb, router]);

  const cats = [...new Set(reqs.map(r => r.category))];
  const byReq = (id: string | null) => docs.filter(d => d.requirementId === id);
  const reqIds = new Set(reqs.map(r => r.id));
  const others = docs.filter(d => !d.requirementId || !reqIds.has(d.requirementId));
  const reqDone = reqs.filter(r => r.required && byReq(r.id).length).length; const reqTotal = reqs.filter(r => r.required).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        {editable ? <BigDrop onFiles={f => upload(f, null)} /> : <div className="card p-6 text-sm text-muted">رفع الملفات مغلق في حالة الطلب الحالية.</div>}
        <div className="card flex flex-col justify-between p-5">
          <div><div className="text-xs text-muted">الملفات الأساسية</div><div className="font-display text-3xl font-black num">{reqDone}<span className="text-base text-muted"> / {reqTotal}</span></div></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest-100"><div className="spectrum-rtl h-full transition-all" style={{ width: `${reqTotal ? (reqDone / reqTotal) * 100 : 100}%` }} /></div>
          <div className="mt-3 text-xs leading-5 text-muted">الملفات يجب أن تغطي السنة المالية <b className="num text-ink">{cycleYear}</b>. لا ترفع بيانات شخصية للمستفيدين؛ استخدم أرقاماً تعريفية.</div>
        </div>
      </div>

      <AnimatePresence>{jobs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="card divide-y divide-line">
          {jobs.map(j => (
            <div key={j.key} className="flex items-center gap-3 px-5 py-3 text-sm">
              {j.stage === 'upload' ? <Loader2 className="size-4 animate-spin text-forest-600" /> : j.stage === 'done' ? <Check className="size-4 text-forest-700" /> : <AlertTriangle className="size-4 text-rose-600" />}
              <span className="flex-1 truncate font-medium">{j.name}</span>
              <span className={cn('text-xs', j.stage === 'error' ? 'text-rose-600' : 'text-muted')}>{j.stage === 'upload' ? 'جارٍ الرفع…' : j.stage === 'done' ? 'تم الرفع' : j.error}</span>
              {j.stage === 'error' && <button type="button" onClick={() => setJobs(js => js.filter(x => x.key !== j.key))} className="text-xs text-muted hover:text-ink">إخفاء</button>}
            </div>
          ))}
        </motion.div>
      )}</AnimatePresence>

      {cats.map(c => (
        <section key={c}>
          <h3 className="mb-3 px-1 font-display text-lg font-semibold">{c}</h3>
          <div className="grid gap-3">
            {reqs.filter(r => r.category === c).map(r => <ReqRow key={r.id} r={r} docs={byReq(r.id)} editable={editable} onFiles={f => upload(f, r.id)} />)}
          </div>
        </section>
      ))}
      <section>
        <h3 className="mb-3 px-1 font-display text-lg font-semibold">ملفات أخرى داعمة</h3>
        <ReqRow r={{ id: '', code: 'OTHER', title: 'أي دليل إضافي', description: 'تقارير، عروض، محاضر، صور ميدانية… ويحدد الخبير المراجع ما يثبته كل ملف', required: false, factorIds: [], category: '' }} docs={others} editable={editable} onFiles={f => upload(f, null)} />
      </section>
    </div>
  );
}

function BigDrop({ onFiles }: { onFiles: (f: File[]) => void }) {
  return (
    <FileDrop onFiles={onFiles} className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed p-8 text-center transition"
      activeClassName="border-lime-brand bg-forest-900 text-white" idleClassName="border-forest-300 bg-white hover:border-forest-600 hover:bg-forest-50/50">
      {({ active }) => (<>
        <div className={cn('mb-3 grid size-16 place-items-center rounded-2xl transition', active ? 'scale-110 bg-lime-brand text-forest-950' : 'bg-forest-950 text-lime-brand')}><CloudUpload className="size-8" /></div>
        <div className="font-display text-xl font-bold">{active ? 'أفلت الملفات هنا' : 'اسحب ملفاتك وأفلتها هنا'}</div>
        <div className={cn('mt-1 text-sm', active ? 'text-white/70' : 'text-muted')}>أو اضغط للاختيار · {UPLOAD_HINT}</div>
        <div className={cn('mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold', active ? 'bg-white/10' : 'bg-lime-100 text-forest-900')}><ShieldCheck className="size-3.5" /> يراجع الخبير المعتمد كل ملف ويربطه بالمعايير المناسبة</div>
      </>)}
    </FileDrop>
  );
}

function ReqRow({ r, docs, editable, onFiles }: { r: Req; docs: Doc[]; editable: boolean; onFiles: (f: File[]) => void }) {
  const done = docs.length > 0;
  return (
    <FileDrop onFiles={onFiles} disabled={!editable} noClick className="card overflow-hidden transition" activeClassName="ring-2 ring-lime-brand" idleClassName="">
      {({ active, open }) => (<>
        <div className="flex flex-wrap items-center gap-4 p-4 md:p-5">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', done ? 'bg-forest-700 text-white' : r.required ? 'bg-orange-50 text-orange-brand ring-1 ring-orange-200' : 'bg-forest-50 text-forest-600')}>{done ? <Check className="size-5" /> : <FileText className="size-5" />}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.title}</span>{r.required ? <span className="rounded-full bg-orange-brand/10 px-2 py-0.5 text-[11px] font-bold text-orange-brand">أساسي</span> : r.code !== 'OTHER' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">اختياري يرفع المستوى</span>}{r.factorIds.slice(0, 5).map(f => <span key={f} className="ltr rounded bg-forest-50 px-1.5 text-[11px] text-forest-700">{f}</span>)}</div>
            <div className="mt-0.5 text-sm text-muted">{r.description}</div>
          </div>
          {editable && <button type="button" onClick={open} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-forest-500 hover:text-forest-800"><UploadCloud className="size-4" /> {done ? 'إضافة ملف' : 'رفع'}</button>}
        </div>
        {active && <div className="bg-lime-100 py-3 text-center text-sm font-semibold text-forest-900">أفلت هنا لربط الملف بـ «{r.title}»</div>}
        {docs.length > 0 && <div className="divide-y divide-line border-t border-line bg-forest-50/30">{docs.map(d => <DocRow key={d.id} d={d} editable={editable} />)}</div>}
      </>)}
    </FileDrop>
  );
}

function DocRow({ d, editable }: { d: Doc; editable: boolean }) {
  const router = useRouter(); const [del, setDel] = useState(false);
  const I = icon(d.mimeType);
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <I className="size-5 shrink-0 text-forest-700" />
      <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{d.fileName}</div><div className="text-xs text-muted">{size(d.size)}</div></div>
      <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-semibold text-forest-800">تم الاستلام</span>
      <a href={`/api/files/${d.id}`} target="_blank" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-forest-800" title="عرض"><Eye className="size-4" /></a>
      {editable && <button type="button" disabled={del} onClick={async () => { if (!window.confirm('حذف الملف؟')) return; setDel(true); await deleteDocument(d.id); router.refresh(); }} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600" title="حذف">{del ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>}
    </div>
  );
}
