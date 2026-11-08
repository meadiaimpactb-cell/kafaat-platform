import { asc, eq } from 'drizzle-orm';
import { db, factors, answers } from '@/db';
import { loadOwn } from '@/lib/portal';
import { recomputeProgress, requiredDocs } from '@/lib/workflow';
import { QuestionsBoard, type QFactor } from '@/components/portal/questions-board';
import { SECTIONS } from '@/lib/domain';

export const metadata = { title: 'أسئلة التقييم' };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ f?: string }> }) {
  const { id } = await params; const sp = await searchParams;
  const { a, editable } = await loadOwn(id);
  const fs = await db.select().from(factors).where(eq(factors.active, true)).orderBy(asc(factors.sortOrder));
  const ans = await db.select().from(answers).where(eq(answers.assessmentId, id));
  const reqs = await requiredDocs(a.track ?? 'EMERGING');
  const p = await recomputeProgress(id);
  const order = SECTIONS.map(s => s.key);
  const list: QFactor[] = fs.sort((x, y) => order.indexOf(x.section) - order.indexOf(y.section) || x.sortOrder - y.sortOrder).map(f => ({
    id: f.id, name: f.name, section: f.section, question: f.orgQuestion ?? f.question, definition: f.definition ?? '', asks: f.asks as string[], evidence: f.evidence as string[], levels: f.levels as string[], group: f.group, tier: f.tier,
    docs: reqs.filter(r => (r.factorIds as string[]).includes(f.id)).map(r => r.title),
  }));
  const initial = Object.fromEntries(ans.map(x => [x.factorId, { status: x.status, selfLevel: x.selfLevel, answer: x.answer ?? '' }]));
  return <QuestionsBoard assessmentId={id} editable={editable} factors={list} initial={initial} sections={SECTIONS} progress={p.progress} focus={sp.f} />;
}
