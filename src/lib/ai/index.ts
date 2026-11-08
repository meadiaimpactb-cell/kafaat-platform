import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { and, asc, eq } from 'drizzle-orm';
import { db, documents, assessments, organizations, factors, documentRequirements, answers, factorReviews } from '@/db';
import { getSetting } from '../settings';
import { decrypt } from '../crypto';
import { readFile } from '../storage';
import { TRACK_LABEL } from '../domain';
import { GATES } from '../scoring';

export interface DocAnalysis {
  source: 'claude' | 'rules';
  docType: string; requirementCode: string | null; period: string | null; summary: string;
  keyFacts: { label: string; value: string }[];
  factorEvidence: { factorId: string; suggestedLevel: number; confidence: number; rationale: string; quote?: string }[];
  issues: string[]; missing: string[];
}
export interface GapAnalysis {
  source: 'claude' | 'rules'; readiness: number; summary: string;
  missing: { title: string; why: string; factorIds: string[]; priority: 'عالية' | 'متوسطة' | 'منخفضة'; kind: 'ملف' | 'إجابة' | 'جودة' }[];
  nextSteps: string[]; at: string;
}

export async function aiConfig() {
  const s = await getSetting('ai');
  const apiKey = decrypt(s.apiKey) || process.env.ANTHROPIC_API_KEY || '';
  return { ...s, apiKey, live: s.enabled && !!apiKey };
}
async function client() { const c = await aiConfig(); return c.live ? { c, anthropic: new Anthropic({ apiKey: c.apiKey }) } : null; }

const SYSTEM = `أنت محلل خبير في منهج «كفاءة الأثر» لتقييم الجهات غير الربحية السعودية. يقيس المنهج الأثر الصافي الموثق لكل وحدة مورد عبر 56 عاملاً، لكل عامل مستويات من 0 (غير مثبت) إلى 4 (رائد).
قواعدك: (1) لا تمنح مستوى إلا بدليل مكتوب في الملف؛ التصريح العام دون بيانات لا يتجاوز المستوى 1. (2) كن متحفظاً: عند التردد اختر الأدنى. (3) اكتب بالعربية الفصحى المختصرة. (4) لا تخترع أرقاماً؛ انقل الأرقام كما وردت. (5) اذكر ما ينقص بصيغة عملية تخبر الجهة ماذا ترفع أو تضيف بالضبط.`;

const DOC_TOOL: Anthropic.Tool = {
  name: 'report_document_analysis',
  description: 'تقرير تحليل وثيقة رفعتها الجهة',
  input_schema: {
    type: 'object',
    properties: {
      docType: { type: 'string', description: 'نوع الوثيقة بالعربية، مثل: تقرير سنوي، قوائم مالية مدققة، تقرير قياس أثر' },
      requirementCode: { type: ['string', 'null'], description: 'رمز المتطلب الأقرب من القائمة المعطاة أو null' },
      period: { type: ['string', 'null'], description: 'الفترة التي تغطيها الوثيقة، مثل 2025' },
      summary: { type: 'string', description: 'ملخص من 2 إلى 4 جمل لما تثبته الوثيقة' },
      keyFacts: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, value: { type: 'string' } }, required: ['label', 'value'] }, description: 'أهم الأرقام والحقائق: المصروفات، المستفيدون، البرامج، النتائج' },
      factorEvidence: { type: 'array', items: { type: 'object', properties: {
        factorId: { type: 'string' }, suggestedLevel: { type: 'integer', minimum: 0, maximum: 4 }, confidence: { type: 'number', minimum: 0, maximum: 1 },
        rationale: { type: 'string' }, quote: { type: 'string', description: 'اقتباس قصير أو رقم صفحة' } }, required: ['factorId', 'suggestedLevel', 'confidence', 'rationale'] } },
      issues: { type: 'array', items: { type: 'string' }, description: 'ملاحظات على جودة البيانات: تناقضات، فترة قديمة، نقص توقيع أو تدقيق' },
      missing: { type: 'array', items: { type: 'string' }, description: 'ما ينقص هذه الوثيقة لتثبت العوامل المرتبطة بها' },
    },
    required: ['docType', 'summary', 'keyFacts', 'factorEvidence', 'issues', 'missing'],
  },
};

async function docBlocks(doc: typeof documents.$inferSelect, maxMb: number): Promise<Anthropic.ContentBlockParam[]> {
  if (doc.size > maxMb * 1048576) throw new Error(`حجم الملف أكبر من ${maxMb} م.ب المسموح للتحليل`);
  const buf = await readFile(doc.storedPath);
  const m = doc.mimeType;
  if (m === 'application/pdf') return [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') }, title: doc.fileName }];
  if (m.startsWith('image/')) return [{ type: 'image', source: { type: 'base64', media_type: m as 'image/png', data: buf.toString('base64') } }];
  let text = '';
  if (m.includes('wordprocessingml')) text = (await (await import('mammoth')).extractRawText({ buffer: buf })).value;
  else if (m.includes('spreadsheetml') || m === 'application/vnd.ms-excel') {
    const ExcelJS = (await import('exceljs')).default; const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buf as unknown as ArrayBuffer);
    wb.eachSheet(ws => { text += `\n## ورقة: ${ws.name}\n`; ws.eachRow({ includeEmpty: false }, r => { text += (r.values as unknown[]).slice(1).map(v => (v && typeof v === 'object' && 'result' in (v as object) ? (v as { result: unknown }).result : v) ?? '').join(' | ') + '\n'; }); });
  } else text = buf.toString('utf8');
  return [{ type: 'text', text: `محتوى الملف «${doc.fileName}»:\n${text.slice(0, 120000)}` }];
}

async function context(assessmentId: string) {
  const a = (await db.select().from(assessments).where(eq(assessments.id, assessmentId)).limit(1))[0];
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const fs = await db.select({ id: factors.id, name: factors.name, evidence: factors.evidence, group: factors.group }).from(factors).where(eq(factors.active, true)).orderBy(asc(factors.sortOrder));
  const reqs = await db.select().from(documentRequirements).where(eq(documentRequirements.active, true)).orderBy(asc(documentRequirements.sortOrder));
  return { a, org, fs, reqs };
}

function rulesDoc(doc: typeof documents.$inferSelect, req: typeof documentRequirements.$inferSelect | undefined): DocAnalysis {
  const fids = (req?.factorIds ?? doc.factorIds ?? []) as string[];
  return {
    source: 'rules', docType: req?.title ?? 'وثيقة مرفوعة', requirementCode: req?.code ?? null, period: null,
    summary: req ? `وثيقة مرفوعة ضمن متطلب «${req.title}». التحليل الآلي التفصيلي غير مفعّل؛ سيُراجعها المقيّم يدوياً.` : 'وثيقة مرفوعة دون ربطها بمتطلب. يُستحسن ربطها بالمتطلب المناسب.',
    keyFacts: [], factorEvidence: fids.map(f => ({ factorId: f, suggestedLevel: 1, confidence: 0.2, rationale: 'وثيقة مرتبطة بالعامل مرفوعة؛ المستوى المبدئي 1 حتى يتحقق المقيّم من محتواها' })),
    issues: [], missing: [],
  };
}

/** تحليل وثيقة واحدة بـ Claude (أو بقواعد بديلة إن لم يُفعّل المفتاح) */
export async function analyzeDocument(docId: string): Promise<DocAnalysis> {
  const doc = (await db.select().from(documents).where(eq(documents.id, docId)).limit(1))[0];
  if (!doc) throw new Error('الوثيقة غير موجودة');
  const { a, org, fs, reqs } = await context(doc.assessmentId);
  const req = reqs.find(r => r.id === doc.requirementId);
  await db.update(documents).set({ aiStatus: 'ANALYZING', aiError: null }).where(eq(documents.id, docId));
  const cl = await client();
  try {
    let result: DocAnalysis;
    if (!cl) result = rulesDoc(doc, req);
    else {
      const blocks = await docBlocks(doc, cl.c.maxFileMb);
      const prompt = `الجهة: ${org.name} — المجال: ${org.field ?? '—'} — المسار الحجمي: ${a.track ? TRACK_LABEL[a.track] : '—'} — السنة المالية المقيّمة: ${a.cycleYear}.
${req ? `رفعت الجهة هذا الملف ضمن المتطلب: ${req.code} «${req.title}» (${req.description ?? ''}).` : 'لم تحدد الجهة المتطلب الذي يخصه الملف.'}

قائمة المتطلبات (الرمز: العنوان):
${reqs.map(r => `${r.code}: ${r.title}`).join('\n')}

العوامل الـ56 (الرمز — الاسم — الأدلة المقبولة):
${fs.map(f => `${f.id} — ${f.name} — ${(f.evidence as string[]).slice(0, 2).join('؛ ')}`).join('\n')}

المطلوب: حلّل الملف، وحدد نوعه والفترة التي يغطيها والمتطلب الأقرب، واستخرج أهم الأرقام، واذكر العوامل التي يقدم لها دليلاً فعلياً مع مستوى مقترح متحفظ وثقة ومبرر، وما ينقصه. إن كانت الفترة غير ${a.cycleYear} فاذكر ذلك في الملاحظات. استخدم أداة report_document_analysis.`;
      const msg = await cl.anthropic.messages.create({ model: cl.c.model, max_tokens: 4096, system: SYSTEM, tools: [DOC_TOOL], tool_choice: { type: 'tool', name: DOC_TOOL.name }, messages: [{ role: 'user', content: [...blocks, { type: 'text', text: prompt }] }] });
      const tu = msg.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
      if (!tu) throw new Error('لم يُرجع النموذج نتيجة منظمة');
      const r = tu.input as Omit<DocAnalysis, 'source'>;
      const valid = new Set(fs.map(f => f.id));
      result = { source: 'claude', ...r, requirementCode: r.requirementCode ?? req?.code ?? null, factorEvidence: (r.factorEvidence ?? []).filter(e => valid.has(e.factorId)) };
    }
    const matched = reqs.find(r => r.code === result.requirementCode);
    await db.update(documents).set({ aiStatus: cl ? 'DONE' : 'SKIPPED', aiResult: result as unknown as Record<string, unknown>, docType: result.docType, requirementId: doc.requirementId ?? matched?.id ?? null }).where(eq(documents.id, docId));
    return result;
  } catch (e) {
    await db.update(documents).set({ aiStatus: 'FAILED', aiError: (e as Error).message }).where(eq(documents.id, docId));
    throw e;
  }
}

// ---------------------------------------------------------------- تحليل النواقص للجهة
export async function analyzeGaps(assessmentId: string): Promise<GapAnalysis> {
  const { a, org, fs, reqs } = await context(assessmentId);
  const docs = await db.select().from(documents).where(eq(documents.assessmentId, assessmentId));
  const ans = await db.select().from(answers).where(eq(answers.assessmentId, assessmentId));
  const track = a.track ?? 'EMERGING';
  const needed = reqs.filter(r => (r.tracks as string[]).includes(track));
  const haveReq = new Set(docs.map(d => d.requirementId).filter(Boolean));
  const ansMap = new Map(ans.map(x => [x.factorId, x]));
  // قواعد ثابتة تُحسب دائماً
  const missing: GapAnalysis['missing'] = [];
  for (const r of needed.filter(r => r.required && !haveReq.has(r.id))) missing.push({ title: `ارفع: ${r.title}`, why: r.description ?? 'متطلب أساسي للتقييم', factorIds: r.factorIds as string[], priority: (r.factorIds as string[]).some(f => f in GATES) ? 'عالية' : 'متوسطة', kind: 'ملف' });
  for (const [g] of Object.entries(GATES)) { const x = ansMap.get(g); if (!x || !x.status || x.status === 'NONE') missing.push({ title: `بوابة أساسية: ${fs.find(f => f.id === g)?.name}`, why: 'شرط لا يُعوَّض؛ دون استيفائه تبقى الجهة «قيد التأهيل»', factorIds: [g], priority: 'عالية', kind: 'إجابة' }); }
  const unanswered = fs.filter(f => !ansMap.get(f.id)?.status);
  if (unanswered.length) missing.push({ title: `أجب عن ${unanswered.length} سؤالاً متبقياً`, why: 'كل عامل دون إجابة يُقدّر بالمستوى 0', factorIds: unanswered.slice(0, 12).map(f => f.id), priority: unanswered.length > 20 ? 'عالية' : 'متوسطة', kind: 'إجابة' });
  for (const d of docs) { const r = d.aiResult as unknown as DocAnalysis | null; r?.issues?.slice(0, 2).forEach(i => missing.push({ title: `ملاحظة على «${d.fileName}»`, why: i, factorIds: [], priority: 'منخفضة', kind: 'جودة' })); }
  const reqDone = needed.filter(r => r.required).length ? needed.filter(r => r.required && haveReq.has(r.id)).length / needed.filter(r => r.required).length : 1;
  const ansDone = (fs.length - unanswered.length) / fs.length;
  let result: GapAnalysis = { source: 'rules', readiness: Math.round((reqDone * 0.5 + ansDone * 0.5) * 100), summary: '', missing, nextSteps: [], at: new Date().toISOString() };
  result.summary = `اكتمال الملفات الأساسية ${Math.round(reqDone * 100)}٪ واكتمال الإجابات ${Math.round(ansDone * 100)}٪.`;
  result.nextSteps = missing.filter(m => m.priority === 'عالية').slice(0, 3).map(m => m.title);
  const cl = await client();
  if (cl && docs.length) {
    try {
      const docSummaries = docs.map(d => { const r = d.aiResult as unknown as DocAnalysis | null; return `- ${d.fileName} (${r?.docType ?? '—'}، ${r?.period ?? '—'}): ${r?.summary ?? 'لم يُحلل'}${r?.missing?.length ? ' | ينقصه: ' + r.missing.join('؛ ') : ''}`; }).join('\n');
      const answersTxt = fs.map(f => { const x = ansMap.get(f.id); return `${f.id} ${f.name}: ${x?.status ?? 'بلا إجابة'}${x?.answer ? ' — ' + x.answer.slice(0, 160) : ''}`; }).join('\n');
      const tool: Anthropic.Tool = { name: 'report_gaps', description: 'ما ينقص ملف الجهة', input_schema: { type: 'object', properties: {
        readiness: { type: 'integer', minimum: 0, maximum: 100 }, summary: { type: 'string' },
        missing: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, why: { type: 'string' }, factorIds: { type: 'array', items: { type: 'string' } }, priority: { type: 'string', enum: ['عالية', 'متوسطة', 'منخفضة'] }, kind: { type: 'string', enum: ['ملف', 'إجابة', 'جودة'] } }, required: ['title', 'why', 'factorIds', 'priority', 'kind'] } },
        nextSteps: { type: 'array', items: { type: 'string' } } }, required: ['readiness', 'summary', 'missing', 'nextSteps'] } };
      const msg = await cl.anthropic.messages.create({ model: cl.c.model, max_tokens: 4096, system: SYSTEM, tools: [tool], tool_choice: { type: 'tool', name: 'report_gaps' }, messages: [{ role: 'user', content:
        `الجهة: ${org.name} (${org.field ?? '—'}) — المسار ${TRACK_LABEL[track]} — السنة المالية ${a.cycleYear}.\nالمتطلبات الأساسية غير المرفوعة: ${missing.filter(m => m.kind === 'ملف').map(m => m.title).join('؛ ') || 'لا شيء'}\n\nملخص الملفات المرفوعة:\n${docSummaries}\n\nإجابات الجهة:\n${answersTxt}\n\nحدد بدقة ما ينقص الجهة لتنال أعلى مستوى تستحقه: الملفات الناقصة، والإجابات الضعيفة، ومشكلات الجودة؛ ورتبها بالأولوية (البوابات أولاً)، واكتب 3 خطوات تالية عملية. استخدم أداة report_gaps.` }] });
      const tu = msg.content.find(b => b.type === 'tool_use') as Anthropic.ToolUseBlock | undefined;
      if (tu) { const r = tu.input as Omit<GapAnalysis, 'source' | 'at'>; result = { source: 'claude', ...r, missing: [...missing.filter(m => m.kind === 'ملف'), ...r.missing.filter(m => m.kind !== 'ملف' || !missing.some(x => x.title === m.title))], at: new Date().toISOString() }; }
    } catch (e) { console.error('gap analysis failed', e); }
  }
  await db.update(assessments).set({ aiGaps: result as unknown as Record<string, unknown>, aiGapsAt: new Date() }).where(eq(assessments.id, assessmentId));
  return result;
}

// ---------------------------------------------------------------- اقتراح مستويات للمقيّم
const SELF_TO_LEVEL: Record<string, number> = { NONE: 0, PARTIAL: 1, YES: 2, NA: 0 };
export async function proposeLevels(assessmentId: string) {
  const { fs } = await context(assessmentId);
  const docs = await db.select().from(documents).where(eq(documents.assessmentId, assessmentId));
  const ans = new Map((await db.select().from(answers).where(eq(answers.assessmentId, assessmentId))).map(x => [x.factorId, x]));
  const ev = new Map<string, DocAnalysis['factorEvidence']>();
  for (const d of docs) for (const e of ((d.aiResult as unknown as DocAnalysis | null)?.factorEvidence ?? [])) { if (!ev.has(e.factorId)) ev.set(e.factorId, []); ev.get(e.factorId)!.push({ ...e, quote: `${d.fileName}${e.quote ? ': ' + e.quote : ''}` }); }
  for (const f of fs) {
    const list = ev.get(f.id) ?? []; const a = ans.get(f.id);
    let level: number; let conf: number; let why: string;
    if (list.length) { const best = list.sort((x, y) => y.confidence - x.confidence)[0]; level = best.suggestedLevel; conf = best.confidence; why = `${best.rationale} (المصدر: ${best.quote})`; }
    else { level = Math.min(1, a?.status ? SELF_TO_LEVEL[a.status] : 0); conf = 0.15; why = a?.status ? `لا دليل مرفوع؛ إجابة الجهة «${a.status === 'YES' ? 'نعم' : a.status === 'PARTIAL' ? 'جزئياً' : 'لا'}» تمنح مستوى مبدئياً لا يتجاوز 1` : 'لا إجابة ولا دليل'; }
    if (a?.selfLevel != null) why += ` · التقدير الذاتي للجهة: ${a.selfLevel}`;
    const existing = (await db.select().from(factorReviews).where(and(eq(factorReviews.assessmentId, assessmentId), eq(factorReviews.factorId, f.id), eq(factorReviews.phase, 'DESK'))).limit(1))[0];
    if (existing) await db.update(factorReviews).set({ aiLevel: level, aiConfidence: conf, aiRationale: why }).where(eq(factorReviews.id, existing.id));
    else await db.insert(factorReviews).values({ assessmentId, factorId: f.id, phase: 'DESK', aiLevel: level, aiConfidence: conf, aiRationale: why });
  }
}
