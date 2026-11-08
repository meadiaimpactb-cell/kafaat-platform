import { desc, eq } from 'drizzle-orm';
import { db, documents } from '@/db';
import { loadOwn } from '@/lib/portal';
import { requiredDocs } from '@/lib/workflow';
import { aiConfig, type GapAnalysis, type DocAnalysis } from '@/lib/ai';
import { DocumentsBoard } from '@/components/portal/documents-board';
import { GapPanel } from '@/components/portal/assessment-actions';
import { MAX_UPLOAD_MB } from '@/lib/storage';

export const metadata = { title: 'الملفات والأدلة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { a, editable } = await loadOwn(id);
  const reqs = await requiredDocs(a.track ?? 'EMERGING');
  const docs = await db.select().from(documents).where(eq(documents.assessmentId, id)).orderBy(desc(documents.createdAt));
  const ai = await aiConfig();
  return (
    <div className="space-y-6">
      <DocumentsBoard assessmentId={id} editable={editable} aiLive={ai.live} maxMb={MAX_UPLOAD_MB} cycleYear={a.cycleYear}
        reqs={reqs.map(r => ({ id: r.id, code: r.code, title: r.title, description: r.description ?? '', required: r.required, factorIds: r.factorIds as string[], category: r.category }))}
        docs={docs.map(d => ({ id: d.id, requirementId: d.requirementId, fileName: d.fileName, size: d.size, mimeType: d.mimeType, aiStatus: d.aiStatus, aiError: d.aiError, aiResult: (d.aiResult as unknown as DocAnalysis) ?? null, createdAt: d.createdAt.toISOString() }))} />
      <GapPanel id={id} initial={(a.aiGaps as unknown as GapAnalysis) ?? null} canRun={editable} aiLive={ai.live} />
    </div>
  );
}
