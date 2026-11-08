import { asc } from 'drizzle-orm';
import { db, documentRequirements } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Card, CardTitle, Badge } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveRequirement } from '@/app/actions/admin';
import { TRACK_LABEL } from '@/lib/domain';

export const metadata = { title: 'متطلبات الملفات' };
function ReqFields({ r }: { r?: typeof documentRequirements.$inferSelect }) {
  const tr = new Set((r?.tracks as string[]) ?? ['EMERGING', 'MEDIUM', 'LARGE']);
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {r && <input type="hidden" name="id" value={r.id} />}
      <label><span className="label">الرمز</span><input name="code" defaultValue={r?.code} className="input ltr uppercase" placeholder="ANNUAL_REPORT" /></label>
      <label className="md:col-span-2"><span className="label">العنوان</span><input name="title" defaultValue={r?.title} className="input" /></label>
      <label><span className="label">التصنيف</span><input name="category" defaultValue={r?.category ?? 'مالي'} className="input" /></label>
      <label className="md:col-span-4"><span className="label">الوصف الذي تراه الجهة</span><input name="description" defaultValue={r?.description ?? ''} className="input" /></label>
      <label className="md:col-span-2"><span className="label">العوامل المرتبطة</span><input name="factorIds" defaultValue={(r?.factorIds as string[] | undefined)?.join(', ') ?? ''} className="input ltr" placeholder="F001, F016" /></label>
      <label><span className="label">الترتيب</span><input name="sortOrder" type="number" defaultValue={r?.sortOrder ?? 99} className="input num" /></label>
      <div className="flex flex-col justify-end gap-1 text-sm">{(['EMERGING', 'MEDIUM', 'LARGE'] as const).map(t => <label key={t} className="flex items-center gap-2"><input type="checkbox" name={'t_' + t} defaultChecked={tr.has(t)} className="size-4 accent-forest-700" /> مسار {TRACK_LABEL[t]}</label>)}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" defaultChecked={r?.required ?? true} className="size-4 accent-forest-700" /> أساسي (يمنع الإرسال إن غاب)</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={r?.active ?? true} className="size-4 accent-forest-700" /> مفعّل</label>
    </div>
  );
}
export default async function Page() {
  await requireStaff('settings.requirements');
  const rows = await db.select().from(documentRequirements).orderBy(asc(documentRequirements.sortOrder));
  return (
    <div className="space-y-6">
      <PageHeader title="متطلبات الملفات" subtitle="الملفات التي تُطلب من الجهات حسب المسار الحجمي، وربطها بالعوامل ليقرأها المساعد والمقيّم في سياقها." />
      <Card className="p-6"><CardTitle title="متطلب جديد" /><ActionForm action={saveRequirement} resetOnOk className="space-y-4"><ReqFields /><Submit>إضافة</Submit></ActionForm></Card>
      <div className="space-y-3">{rows.map(r => (
        <details key={r.id} className="card group">
          <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4"><span className="ltr w-44 font-mono text-xs text-forest-700">{r.code}</span><span className="flex-1 font-semibold">{r.title}</span>{r.required ? <Badge tone="orange">أساسي</Badge> : <Badge>اختياري</Badge>}<span className="text-xs text-muted">{(r.tracks as string[]).map(t => TRACK_LABEL[t as 'EMERGING']).join(' · ')}</span>{!r.active && <Badge tone="rose">معطل</Badge>}</summary>
          <div className="border-t border-line p-5"><ActionForm action={saveRequirement} className="space-y-4"><ReqFields r={r} /><Submit size="sm">حفظ</Submit></ActionForm></div>
        </details>
      ))}</div>
    </div>
  );
}
