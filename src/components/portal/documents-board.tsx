'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Bot, Check, ChevronDown, CloudUpload, Eye, FileSpreadsheet, FileText, FileImage, Loader2, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';
import { deleteDocument } from '@/app/actions/org';
import { cn } from '@/lib/cn';
import type { DocAnalysis } from '@/lib/ai';

type Req = { id: string; code: string; title: string; description: string; required: boolean; factorIds: string[]; category: string };
type Doc = { id: string; requirementId: string | null; fileName: string; size: number; mimeType: string; aiStatus: string; aiError: string | null; aiResult: DocAnalysis | null; createdAt: string };
type Job = { key: string; name: string; reqId: string | null; stage: 'upload' | 'analyze' | 'done' | 'error'; error?: string };

const ACCEPT = { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'], 'text/csv': ['.csv'], 'text/plain': ['.txt'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/webp': ['.webp'], 'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'] };
const size = (b: number) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} ك.ب` : `${(b / 1048576).toFixed(1)} م.ب`);
const icon = (m: string) => (m.includes('sheet') || m.includes('excel') || m.includes('csv') ? FileSpreadsheet : m.startsWith('image/') ? FileImage : FileText);

export function DocumentsBoard({ assessmentId, editable, aiLive, maxMb, cycleYear, reqs, docs }: { assessmentId: string; editable: boolean; aiLive: boolean; maxMb: number; cycleYear: number; reqs: Req[]; docs: Doc[] }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [openDoc, setOpenDoc] = useState<string | null>(null);
  const setJob = (key: string, p: Partial<Job>) => setJobs(js => js.map(j => (j.key === key ? { ...j, ...p } : j)));

  const upload = useCallback(async (files: File[], reqId: string | null) => {
    for (const file of files) {
      const key = Math.random().toString(36).slice(2);
      setJobs(js => [{ key, name: file.name, reqId, stage: 'upload' }, ...js]);
      if (file.size > maxMb * 1048576) { setJob(key, { stage: 'error', error: `أكبر من ${maxMb} م.ب` }); continue; }
      const fd = new FormData(); fd.append('file', file); fd.append('assessmentId', assessmentId); if (reqId) fd.append('requirementId', reqId);
      try {
        const r = await fetch('/api/uploads', { method: 'POST', body: fd }); const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? 'تعذر الرفع');
        setJob(key, { stage: 'analyze' }); router.refresh();
        const r2 = await fetch(`/api/ai/analyze/${j.id}`, { method: 'POST' }); const j2 = await r2.json().catch(() => ({}));
        if (!r2.ok) setJob(key, { stage: 'error', error: 'رُفع الملف، وتعذر تحليله: ' + (j2.error ?? '') }); else setJob(key, { stage: 'done' });
        setOpenDoc(j.id);
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
        {editable ? <BigDrop onFiles={f => upload(f, null)} aiLive={aiLive} /> : <div className="card p-6 text-sm text-muted">رفع الملفات مغلق في حالة الطلب الحالية.</div>}
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
              {j.stage === 'upload' ? <Loader2 className="size-4 animate-spin text-forest-600" /> : j.stage === 'analyze' ? <Bot className="size-4 animate-pulse text-forest-700" /> : j.stage === 'done' ? <Check className="size-4 text-forest-700" /> : <AlertTriangle className="size-4 text-rose-600" />}
              <span className="flex-1 truncate font-medium">{j.name}</span>
              <span className={cn('text-xs', j.stage === 'error' ? 'text-rose-600' : 'text-muted')}>{j.stage === 'upload' ? 'جارٍ الرفع…' : j.stage === 'analyze' ? (aiLive ? 'Claude يقرأ الملف ويستخرج الأدلة…' : 'جارٍ الفهرسة…') : j.stage === 'done' ? 'اكتمل' : j.error}</span>
              {j.stage === 'analyze' && <div className="h-1 w-24 overflow-hidden rounded-full bg-forest-100"><div className="h-full w-1/3 animate-[scan_1.2s_ease-in-out_infinite] rounded-full bg-forest-600" /></div>}
            </div>
          ))}
        </motion.div>
      )}</AnimatePresence>

      {cats.map(c => (
        <section key={c}>
          <h3 className="mb-3 px-1 font-display text-lg font-semibold">{c}</h3>
          <div className="grid gap-3">
            {reqs.filter(r => r.category === c).map(r => <ReqRow key={r.id} r={r} docs={byReq(r.id)} editable={editable} onFiles={f => upload(f, r.id)} openDoc={openDoc} setOpenDoc={setOpenDoc} />)}
          </div>
        </section>
      ))}
      <section>
        <h3 className="mb-3 px-1 font-display text-lg font-semibold">ملفات أخرى داعمة</h3>
        <ReqRow r={{ id: '', code: 'OTHER', title: 'أي دليل إضافي', description: 'تقارير، عروض، محاضر، صور ميدانية… سيحدد المساعد ما يثبته كل ملف', required: false, factorIds: [], category: '' }} docs={others} editable={editable} onFiles={f => upload(f, null)} openDoc={openDoc} setOpenDoc={setOpenDoc} />
      </section>
    </div>
  );
}

function BigDrop({ onFiles, aiLive }: { onFiles: (f: File[]) => void; aiLive: boolean }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onFiles, accept: ACCEPT, multiple: true });
  return (
    <div {...getRootProps()} className={cn('relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[22px] border-2 border-dashed p-8 text-center transition', isDragActive ? 'border-lime-brand bg-forest-900 text-white' : 'border-forest-300 bg-white hover:border-forest-600 hover:bg-forest-50/50')}>
      <input {...getInputProps()} />
      <div className={cn('mb-3 grid size-16 place-items-center rounded-2xl transition', isDragActive ? 'scale-110 bg-lime-brand text-forest-950' : 'bg-forest-950 text-lime-brand')}><CloudUpload className="size-8" /></div>
      <div className="font-display text-xl font-bold">{isDragActive ? 'أفلت الملفات هنا' : 'اسحب ملفاتك وأفلتها هنا'}</div>
      <div className={cn('mt-1 text-sm', isDragActive ? 'text-white/70' : 'text-muted')}>أو اضغط للاختيار · PDF، Word، Excel، صور</div>
      <div className={cn('mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold', isDragActive ? 'bg-white/10' : 'bg-lime-100 text-forest-900')}><Sparkles className="size-3.5" />{aiLive ? 'Claude يحدد نوع كل ملف ويربطه بالمتطلب والعوامل تلقائياً' : 'يُربط الملف بالمتطلب المناسب ويراجعه المقيّم'}</div>
    </div>
  );
}

function ReqRow({ r, docs, editable, onFiles, openDoc, setOpenDoc }: { r: Req; docs: Doc[]; editable: boolean; onFiles: (f: File[]) => void; openDoc: string | null; setOpenDoc: (id: string | null) => void }) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ onDrop: onFiles, accept: ACCEPT, noClick: true, disabled: !editable });
  const done = docs.length > 0;
  return (
    <div {...getRootProps()} className={cn('card overflow-hidden transition', isDragActive && 'ring-2 ring-lime-brand')}>
      <input {...getInputProps()} />
      <div className="flex flex-wrap items-center gap-4 p-4 md:p-5">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', done ? 'bg-forest-700 text-white' : r.required ? 'bg-orange-50 text-orange-brand ring-1 ring-orange-200' : 'bg-forest-50 text-forest-600')}>{done ? <Check className="size-5" /> : <FileText className="size-5" />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{r.title}</span>{r.required ? <span className="rounded-full bg-orange-brand/10 px-2 py-0.5 text-[11px] font-bold text-orange-brand">أساسي</span> : r.code !== 'OTHER' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">اختياري يرفع المستوى</span>}{r.factorIds.slice(0, 5).map(f => <span key={f} className="ltr rounded bg-forest-50 px-1.5 text-[11px] text-forest-700">{f}</span>)}</div>
          <div className="mt-0.5 text-sm text-muted">{r.description}</div>
        </div>
        {editable && <button type="button" onClick={open} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-forest-500 hover:text-forest-800"><UploadCloud className="size-4" /> {done ? 'إضافة ملف' : 'رفع'}</button>}
      </div>
      {isDragActive && <div className="bg-lime-100 py-3 text-center text-sm font-semibold text-forest-900">أفلت هنا لربط الملف بـ «{r.title}»</div>}
      {docs.length > 0 && <div className="divide-y divide-line border-t border-line bg-forest-50/30">{docs.map(d => <DocRow key={d.id} d={d} editable={editable} open={openDoc === d.id} toggle={() => setOpenDoc(openDoc === d.id ? null : d.id)} />)}</div>}
    </div>
  );
}

function DocRow({ d, editable, open, toggle }: { d: Doc; editable: boolean; open: boolean; toggle: () => void }) {
  const router = useRouter(); const [del, setDel] = useState(false);
  const I = icon(d.mimeType); const r = d.aiResult;
  const badge = d.aiStatus === 'DONE' ? { t: 'حلّله Claude', c: 'bg-forest-100 text-forest-800' } : d.aiStatus === 'ANALYZING' ? { t: 'يُحلل…', c: 'bg-amber-100 text-amber-800' } : d.aiStatus === 'FAILED' ? { t: 'تعذر التحليل', c: 'bg-rose-50 text-rose-700' } : d.aiStatus === 'SKIPPED' ? { t: 'فُهرس', c: 'bg-slate-100 text-slate-700' } : { t: 'بانتظار التحليل', c: 'bg-slate-100 text-slate-600' };
  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-3">
        <I className="size-5 shrink-0 text-forest-700" />
        <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{d.fileName}</div><div className="text-xs text-muted">{size(d.size)}{r?.docType ? ` · ${r.docType}` : ''}{r?.period ? ` · ${r.period}` : ''}</div></div>
        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', badge.c)}>{badge.t}</span>
        <a href={`/api/files/${d.id}`} target="_blank" className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white hover:text-forest-800" title="عرض"><Eye className="size-4" /></a>
        {r && <button type="button" onClick={toggle} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-white" title="نتيجة التحليل"><ChevronDown className={cn('size-4 transition', open && 'rotate-180')} /></button>}
        {editable && <button type="button" disabled={del} onClick={async () => { if (!confirmDel()) return; setDel(true); await deleteDocument(d.id); router.refresh(); }} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-rose-50 hover:text-rose-600" title="حذف">{del ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button>}
      </div>
      <AnimatePresence initial={false}>{open && r && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
          <div className="mx-5 mb-4 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-line">
            <div className="flex items-start gap-3"><div className="grid size-9 shrink-0 place-items-center rounded-xl bg-forest-950 text-lime-brand"><Bot className="size-4" /></div><p className="text-sm leading-7 text-ink-2">{r.summary}</p></div>
            {r.keyFacts?.length > 0 && <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{r.keyFacts.map((k, i) => <div key={i} className="rounded-xl bg-forest-50 p-3"><div className="text-[11px] text-muted">{k.label}</div><div className="font-semibold">{k.value}</div></div>)}</div>}
            {r.factorEvidence?.length > 0 && <div><div className="mb-2 text-sm font-semibold">العوامل التي يقدّم لها الملف دليلاً</div><div className="flex flex-wrap gap-2">{r.factorEvidence.map((e, i) => <span key={i} title={e.rationale} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs"><span className="ltr font-semibold text-forest-700">{e.factorId}</span><span className="text-muted">مستوى مبدئي</span><b className="num">{e.suggestedLevel}</b></span>)}</div></div>}
            {(r.issues?.length > 0 || r.missing?.length > 0) && <div className="grid gap-3 md:grid-cols-2">
              {r.missing?.length > 0 && <div className="rounded-xl bg-orange-50 p-4 text-sm"><div className="mb-1.5 font-semibold text-orange-900">ما ينقص هذا الملف</div><ul className="space-y-1 text-orange-950/80">{r.missing.map((m, i) => <li key={i}>• {m}</li>)}</ul></div>}
              {r.issues?.length > 0 && <div className="rounded-xl bg-amber-50 p-4 text-sm"><div className="mb-1.5 font-semibold text-amber-900">ملاحظات الجودة</div><ul className="space-y-1 text-amber-950/80">{r.issues.map((m, i) => <li key={i}>• {m}</li>)}</ul></div>}
            </div>}
            {r.source === 'rules' && <div className="flex items-center gap-2 text-xs text-muted"><X className="size-3.5" /> التحليل الذكي غير مفعّل؛ هذه فهرسة أولية ويقرأ المقيّم الملف كاملاً.</div>}
          </div>
        </motion.div>
      )}</AnimatePresence>
      {d.aiStatus === 'FAILED' && d.aiError && <div className="px-5 pb-3 text-xs text-rose-600">{d.aiError}</div>}
    </div>
  );
}
function confirmDel() { return typeof window !== 'undefined' && window.confirm('حذف الملف؟'); }
