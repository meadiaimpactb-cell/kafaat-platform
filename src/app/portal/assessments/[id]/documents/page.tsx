import { desc, eq } from 'drizzle-orm';
import { db, documents } from '@/db';
import { loadOwn } from '@/lib/portal';
import { requiredDocs } from '@/lib/workflow';
import { DocumentsBoard } from '@/components/portal/documents-board';
import { MAX_UPLOAD_MB } from '@/lib/storage';

export const metadata = { title: 'الملفات والأدلة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { a, editable } = await loadOwn(id);
  const reqs = await requiredDocs(a.track ?? 'EMERGING');
  const docs = await db.select().from(documents).where(eq(documents.assessmentId, id)).orderBy(desc(documents.createdAt));
  return (
    <div className="space-y-6">
      <DocumentsBoard assessmentId={id} editable={editable} maxMb={MAX_UPLOAD_MB} cycleYear={a.cycleYear}
        reqs={reqs.map(r => ({ id: r.id, code: r.code, title: r.title, description: r.description ?? '', required: r.required, factorIds: r.factorIds as string[], category: r.category }))}
        docs={docs.map(d => ({ id: d.id, requirementId: d.requirementId, fileName: d.fileName, size: d.size, mimeType: d.mimeType, createdAt: d.createdAt.toISOString() }))} />
    </div>
  );
}
