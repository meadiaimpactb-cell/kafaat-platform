/* بذر قاعدة البيانات: المنهجية، والإعدادات، والبوابات، وحسابات تجريبية لكل دور */
import './load-env';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { db, factors, documentRequirements, settings, paymentGateways, users, organizations, assessments, answers, factorReviews, documents, coupons, payments, invoices, certificates, visits, counters, activityLogs, notifications, infoRequests, sessions, organizationMembers, orgDocuments, visitEvents, messages, userIdentities, passwordResets, emailOutbox } from './index';
import FACTORS from './data/factors.json';
import { evaluate, snapshot, trackOf, FACTOR_IDS } from '../lib/scoring';

const EX_L: Record<string, number> = { F001: 2, F002: 3, F009: 2, F011: 2, F010: 2, F013: 3, F005: 3, F003: 2, F006: 1, F121: 3, F046: 2, F047: 3, F048: 3, F050: 2, F051: 3, F052: 3, F053: 3, F054: 2, F129: 3, F056: 3, F060: 3, F127: 3, F016: 3, F049: 2, F057: 2, F106: 2, F012: 2, F004: 1, F021: 2, F055: 3 };
for (const f of FACTOR_IDS) if (EX_L[f] == null) EX_L[f] = 2;

const REQS = [
  ['ANNUAL_REPORT', 'التقرير السنوي للسنة المالية المقيّمة', 'التقرير السنوي المعتمد للسنة المالية الماضية بالبرامج والمستفيدين والنتائج', true, ['EMERGING', 'MEDIUM', 'LARGE'], ['F001', 'F010', 'F013', 'F129', 'F060'], 'تقارير'],
  ['AUDITED_FS', 'القوائم المالية المدققة', 'القوائم المالية للسنة الماضية مع تقرير المراجع الخارجي', true, ['EMERGING', 'MEDIUM', 'LARGE'], ['F016', 'F005', 'F001'], 'مالي'],
  ['PROGRAM_COSTS', 'تقرير الكلفة الكاملة للبرامج', 'كلفة كل برنامج بعد توزيع المصروفات المشتركة وإضافة العيني والتطوعي، ومفاتيح التوزيع', true, ['MEDIUM', 'LARGE'], ['F016', 'F005', 'F001'], 'مالي'],
  ['OUTCOME_DEFINITION', 'وثيقة تعريف النتائج', 'لكل برنامج رئيس: القضية، ووحدة النتيجة، والعتبة، والمستهدف، وطريقة القياس وموعده', true, ['EMERGING', 'MEDIUM', 'LARGE'], ['F127', 'F053', 'F051'], 'قياس'],
  ['THEORY_OF_CHANGE', 'نظرية التغيير أو الإطار المنطقي', 'مسار التغيير من الأنشطة إلى النتائج مع الافتراضات والأدلة', true, ['EMERGING', 'MEDIUM', 'LARGE'], ['F056', 'F021'], 'قياس'],
  ['KPI_FRAMEWORK', 'دليل المؤشرات وبطاقاتها', 'تعريف كل مؤشر ومعادلته ومصدر بياناته ودورية قياسه', false, ['EMERGING', 'MEDIUM', 'LARGE'], ['F053', 'F051', 'F052'], 'قياس'],
  ['BASELINE_DATA', 'بيانات خط الأساس والقياس القبلي والبعدي', 'نتائج القياس قبل التدخل وبعده لعينة المستفيدين', true, ['MEDIUM', 'LARGE'], ['F048', 'F010'], 'قياس'],
  ['IMPACT_REPORT', 'تقرير قياس الأثر أو دراسة العائد الاجتماعي', 'أحدث تقرير أثر يتضمن المرشحات الأربعة (الوزن الميت والإسناد والإزاحة والتلاشي)', false, ['EMERGING', 'MEDIUM', 'LARGE'], ['F046', 'F009', 'F004', 'F010'], 'قياس'],
  ['SROI_STUDY', 'دراسة العائد الاجتماعي على الاستثمار بقواعد موحدة', 'مطلوبة للمسار الكبير', true, ['LARGE'], ['F004', 'F046'], 'قياس'],
  ['FOLLOWUP_DATA', 'بيانات المتابعة بعد انتهاء التدخل', 'قياس استمرار النتيجة بعد 6 أشهر أو أكثر', false, ['EMERGING', 'MEDIUM', 'LARGE'], ['F050', 'F011'], 'قياس'],
  ['BENEFICIARY_REGISTER', 'سجل المستفيدين (دون بيانات شخصية)', 'الملتحقون والمكملون ومن بلغوا العتبة لكل برنامج، بأرقام تعريفية لا أسماء', true, ['EMERGING', 'MEDIUM', 'LARGE'], ['F002', 'F054', 'F052', 'F020'], 'بيانات'],
  ['DATA_SYSTEM', 'وصف نظام جمع البيانات', 'النظام أو المنصة المستخدمة وصلاحياتها وكيف تُدقق البيانات', true, ['EMERGING', 'MEDIUM', 'LARGE'], ['F055', 'F052'], 'بيانات'],
  ['EVALUATION_DESIGN', 'منهجية التقييم والتحقق المستقل', 'تصميم التقييم (قبلي-بعدي، مجموعة مقارنة...) وأي تحقق خارجي', false, ['EMERGING', 'MEDIUM', 'LARGE'], ['F049', 'F057'], 'قياس'],
  ['BOARD_DECISIONS', 'محاضر قرارات الأثر', 'محاضر المجلس أو الإدارة التي اتُخذت فيها قرارات بناءً على نتائج القياس', false, ['EMERGING', 'MEDIUM', 'LARGE'], ['F060', 'F047'], 'حوكمة'],
  ['PORTFOLIO', 'قائمة البرامج وإنفاق كل برنامج', 'كل البرامج وإنفاقها ونسبة المقيس منها (نطاق الادعاء)', true, ['MEDIUM', 'LARGE'], ['F129'], 'مالي'],
  ['INCENTIVES_POLICY', 'سياسة الحوافز ومنع الانتقاء', 'معايير قبول المستفيدين وسياسات الحوافز التي تمنع انتقاء الحالات السهلة', false, ['EMERGING', 'MEDIUM', 'LARGE'], ['F106', 'F020'], 'حوكمة'],
] as const;

const PERMS_MANAGER = ['orgs.view', 'orgs.manage', 'assessments.view', 'assessments.assign', 'assessments.manage', 'visits.manage', 'certificates.issue', 'payments.view', 'payments.approve', 'coupons.manage', 'reports.view', 'orgs.verify'];

async function main() {
  console.log('… تنظيف الجداول');
  for (const t of [emailOutbox, passwordResets, userIdentities, messages, visitEvents, orgDocuments, organizationMembers, notifications, activityLogs, infoRequests, certificates, visits, invoices, payments, factorReviews, documents, answers, assessments, sessions, users, organizations, coupons, documentRequirements, factors, paymentGateways, settings, counters]) await db.delete(t);

  console.log('… المنهجية: معايير التقييم');
  await db.insert(factors).values((FACTORS as any[]).map(f => ({ id: f.id, name: f.name, nameEn: f.nameEn, score: f.score, tier: f.tier, rank: f.rank, type: f.type, group: f.group, axis: f.axis, weight: f.weight, roles: f.roles, section: f.section,
    question: f.question, definition: f.definition, effect: f.effect, asks: f.asks, evidence: f.evidence, calc: f.calc, levels: f.levels, rule: f.rule, flags: f.flags, example: f.example, sortOrder: f.sortOrder })));
  await db.insert(documentRequirements).values(REQS.map((r, i) => ({ code: r[0], title: r[1], description: r[2], required: r[3], tracks: [...r[4]], factorIds: [...r[5]], category: r[6], sortOrder: i + 1 })));

  console.log('… الإعدادات والبوابات');
  await db.insert(settings).values([
    { key: 'pricing', value: { certificate: 500, visit: 5000, currency: 'SAR', vatRate: 15, pricesIncludeVat: true } },
    { key: 'bank', value: { bankName: 'مصرف الراجحي', accountName: 'كفاءة الأثر', iban: 'SA00 0000 0000 0000 0000 0000', note: 'يُرجى كتابة رقم الدفعة في وصف التحويل' } },
  ]);
  await db.insert(paymentGateways).values([
    { id: 'sandbox', name: 'بوابة تجريبية', enabled: true, mode: 'TEST', sortOrder: 1 },
    { id: 'moyasar', name: 'ميسر', enabled: false, mode: 'TEST', sortOrder: 2 },
    { id: 'tap', name: 'تاب', enabled: false, mode: 'TEST', sortOrder: 3 },
    { id: 'bank_transfer', name: 'تحويل بنكي', enabled: true, mode: 'LIVE', sortOrder: 4 },
  ]);
  await db.insert(coupons).values([
    { code: 'LAUNCH25', type: 'PERCENT', value: 25, product: 'ALL', maxUses: 100, note: 'خصم الإطلاق' },
    { code: 'TEST100', type: 'PERCENT', value: 100, product: 'ALL', maxUses: 50, note: 'للاختبار الداخلي فقط' },
    { code: 'VISIT1000', type: 'FIXED', value: 1000, product: 'VERIFICATION_VISIT', note: 'خصم على زيارة التحقق' },
  ]);

  console.log('… المستخدمون');
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  const U = async (email: string, pass: string, name: string, role: any, extra: Record<string, unknown> = {}) => {
    const id = createId(); await db.insert(users).values({ id, email, passwordHash: hash(pass), name, role, ...extra }); return id;
  };
  const admin = await U('admin@kafaat.sa', 'Admin@12345', 'مدير المنصة', 'SUPER_ADMIN', { phone: '0500000001' });
  const manager = await U('manager@kafaat.sa', 'Manager@12345', 'سارة العتيبي', 'ACCOUNT_MANAGER', { permissions: PERMS_MANAGER, phone: '0500000002' });
  const assessor = await U('assessor@kafaat.sa', 'Assessor@12345', 'د. خالد الحربي', 'ASSESSOR', { isFieldVerifier: true, specialties: 'قياس الأثر، التنمية الأسرية' });
  const assessor2 = await U('assessor2@kafaat.sa', 'Assessor@12345', 'نورة القحطاني', 'ASSESSOR', { isFieldVerifier: true, specialties: 'التحليل المالي وتحليل الكلفة' });

  const mkOrg = async (o: Record<string, any>) => { const id = createId(); await db.insert(organizations).values({ id, ...o } as any); return id; };
  const year = new Date().getFullYear() - 1;

  // 1) جهة لدى الخبير المراجع
  const org1 = await mkOrg({ name: 'جمعية النماء للتمكين الأسري', licenseNo: '1234', orgType: 'جمعية أهلية', region: 'القصيم', city: 'بريدة', field: 'التنمية الأسرية', foundedYear: 2012, email: 'info@nama-demo.sa', phone: '0163000000',
    fiscalYearEnd: '12-31', lastYearExpenses: 12_400_000, lastYearRevenue: 13_100_000, programExpenses: 10_200_000, beneficiariesCount: 4200, programsCount: 6, employeesCount: 38, volunteersCount: 210, track: 'MEDIUM',
    description: 'جهة تجريبية للتوضيح (بيانات افتراضية): تمكين الأسر اقتصادياً عبر التدريب والتوظيف والمشروعات الصغيرة.', contactName: 'عبدالله السالم', contactTitle: 'المدير التنفيذي', profileCompleted: true, accountManagerId: manager });
  await U('org@demo.sa', 'Org@12345', 'عبدالله السالم', 'ORG_USER', { orgId: org1, orgRole: 'OWNER', phone: '0550000001' });

  // 2) جهة صدرت لها نتيجة غير موثقة وزيارتها مدفوعة بانتظار الجدولة
  const org2 = await mkOrg({ name: 'جمعية سنا للتنمية المجتمعية', licenseNo: '5678', orgType: 'جمعية أهلية', region: 'الرياض', city: 'الرياض', field: 'التمكين الاقتصادي والتوظيف', foundedYear: 2016, email: 'info@sana-demo.sa',
    fiscalYearEnd: '12-31', lastYearExpenses: 6_800_000, programExpenses: 5_600_000, beneficiariesCount: 1900, programsCount: 4, employeesCount: 21, volunteersCount: 95, track: 'MEDIUM',
    description: 'جهة تجريبية للتوضيح (بيانات افتراضية).', contactName: 'هند الدوسري', contactTitle: 'مديرة البرامج', profileCompleted: true, accountManagerId: manager });
  await U('org2@demo.sa', 'Org@12345', 'هند الدوسري', 'ORG_USER', { orgId: org2, orgRole: 'OWNER' });

  // 3) جهة حاصلة على شهادة موثقة
  const org3 = await mkOrg({ name: 'جمعية أثر الخير الصحية', licenseNo: '9012', orgType: 'جمعية أهلية', region: 'المنطقة الشرقية', city: 'الدمام', field: 'الصحة', foundedYear: 2009, email: 'info@athar-demo.sa',
    fiscalYearEnd: '12-31', lastYearExpenses: 41_000_000, programExpenses: 35_500_000, beneficiariesCount: 26000, programsCount: 9, employeesCount: 120, volunteersCount: 640, track: 'LARGE',
    description: 'جهة تجريبية للتوضيح (بيانات افتراضية).', contactName: 'فهد الشهري', contactTitle: 'الرئيس التنفيذي', profileCompleted: true, accountManagerId: manager });
  await U('org3@demo.sa', 'Org@12345', 'فهد الشهري', 'ORG_USER', { orgId: org3, orgRole: 'OWNER' });

  // 4) جهة بانتظار الدفع
  const org4 = await mkOrg({ name: 'جمعية رواء للتنمية', licenseNo: '3456', orgType: 'جمعية أهلية', region: 'مكة المكرمة', city: 'جدة', field: 'التعليم', foundedYear: 2019, email: 'info@rawaa-demo.sa',
    fiscalYearEnd: '12-31', lastYearExpenses: 1_900_000, beneficiariesCount: 640, programsCount: 3, employeesCount: 9, volunteersCount: 40, track: 'EMERGING', description: 'جهة تجريبية للتوضيح (بيانات افتراضية).', profileCompleted: true });
  await U('org4@demo.sa', 'Org@12345', 'ريم الغامدي', 'ORG_USER', { orgId: org4, orgRole: 'OWNER' });

  // 5) جهة جديدة لم تكمل بياناتها
  const org5 = await mkOrg({ name: 'جمعية جديدة (لم تكتمل بياناتها)', profileCompleted: false });
  await U('new@demo.sa', 'Org@12345', 'مستخدم جديد', 'ORG_USER', { orgId: org5, orgRole: 'OWNER' });


  // بيانات الترخيص والتفويض وحالات التوثيق + عضويات الحسابات (حساب واحد قد يدير أكثر من جهة)
  const org6 = await mkOrg({ name: 'جمعية الغد للتطوع', licenseNo: '7788', orgType: 'جمعية أهلية', region: 'المدينة المنورة', city: 'المدينة المنورة', field: 'العمل التطوعي', profileCompleted: false });
  const lic = (i: number) => ({
    licenseIssuer: 'المركز الوطني لتنمية القطاع غير الربحي', licenseIssueDate: new Date(Date.UTC(2014 + i, 0, 15)), licenseExpiry: new Date(Date.UTC(year + 3, 11, 31)),
    address: 'حي النخيل، طريق الملك فهد', nationalAddress: 'RRRD2929', repTitle: 'المدير التنفيذي', repEmail: 'rep@demo.sa', repPhone: '0550000000',
  });
  const orgUser = async (email: string) => (await db.select().from(users).where(eq(users.email, email)))[0].id;
  const addOrgDocs = async (orgId: string, uploader: string, kinds: string[]) => {
    for (const k of kinds) {
      const rel = path.join('org', orgId, `${createId()}.txt`); const body = `مستند تجريبي (${k}) — ملف توضيحي للاختبار\n`;
      fs.mkdirSync(path.join(path.resolve(process.env.STORAGE_DIR || './storage/uploads'), 'org', orgId), { recursive: true }); fs.writeFileSync(path.join(path.resolve(process.env.STORAGE_DIR || './storage/uploads'), rel), body);
      await db.insert(orgDocuments).values({ orgId, kind: k as 'LICENSE', fileName: `${k}.txt`, storedPath: rel, mimeType: 'text/plain', size: Buffer.byteLength(body), sha256: crypto.createHash('sha256').update(body).digest('hex'), uploadedById: uploader });
    }
  };
  const ownerEmails: [string, string][] = [['org@demo.sa', org1], ['org2@demo.sa', org2], ['org3@demo.sa', org3], ['org4@demo.sa', org4], ['new@demo.sa', org5]];
  for (const [e, o] of ownerEmails) await db.insert(organizationMembers).values({ orgId: o, userId: await orgUser(e), role: 'OWNER' });
  await db.insert(organizationMembers).values({ orgId: org6, userId: await orgUser('org@demo.sa'), role: 'OWNER' }); // حساب واحد، جهتان
  await db.update(organizations).set({ createdById: await orgUser('org@demo.sa') }).where(eq(organizations.id, org6));
  const verifiedAt = new Date(Date.now() - 30 * 864e5);
  const DOCS = ['LICENSE', 'BYLAWS', 'AUTH_LETTER'];
  for (const [i, o] of [org1, org2, org3].entries()) {
    await db.update(organizations).set({ ...lic(i), verificationStatus: 'VERIFIED', verifiedAt, verifiedById: admin, verificationNote: 'اكتمل التحقق من الترخيص والمستندات' }).where(eq(organizations.id, o));
    await addOrgDocs(o, await orgUser(['org@demo.sa', 'org2@demo.sa', 'org3@demo.sa'][i]), DOCS);
  }
  await db.update(organizations).set({ ...lic(5), verificationStatus: 'PENDING', submittedForVerificationAt: new Date(Date.now() - 864e5) }).where(eq(organizations.id, org4));
  await addOrgDocs(org4, await orgUser('org4@demo.sa'), DOCS);

  console.log('… طلبات التقييم التجريبية');
  const ago0 = (d: number) => new Date(Date.now() - d * 864e5);
  const num = (n: number) => `KA-${year + 1}-${String(n).padStart(4, '0')}`;
  const ansStatus = (l: number) => (l >= 3 ? 'YES' : l >= 1 ? 'PARTIAL' : 'NONE');
  const fillAnswers = async (aid: string, L: Record<string, number>) => {
    await db.insert(answers).values(FACTOR_IDS.map(f => ({ assessmentId: aid, factorId: f, status: ansStatus(L[f]) as any, selfLevel: Math.min(4, L[f] + (f === 'F001' ? 1 : 0)),
      answer: L[f] >= 3 ? 'نعم، الممارسة قائمة وموثقة للبرامج الرئيسة، والأدلة مرفوعة في مركز الملفات.' : L[f] >= 1 ? 'جزئياً: الممارسة مطبقة في بعض البرامج، ونعمل على توسيعها.' : 'لا توجد ممارسة موثقة حالياً.' })));
  };
  const reqRows = await db.select().from(documentRequirements);
  const storage = path.resolve(process.env.STORAGE_DIR || './storage/uploads');
  const addDocs = async (aid: string, codes: string[], uploader: string) => {
    for (const c of codes) {
      const r = reqRows.find(x => x.code === c)!; const rel = path.join(aid, `${createId()}.txt`);
      const body = `وثيقة تجريبية: ${r.title}\nالسنة المالية ${year}\n(ملف توضيحي للاختبار، لا يمثل بيانات حقيقية)\n`;
      fs.mkdirSync(path.join(storage, aid), { recursive: true }); fs.writeFileSync(path.join(storage, rel), body);
      await db.insert(documents).values({ assessmentId: aid, uploadedById: uploader, requirementId: r.id, factorIds: r.factorIds, fileName: `${r.title} ${year}.txt`, storedPath: rel, mimeType: 'text/plain', size: Buffer.byteLength(body), sha256: crypto.createHash('sha256').update(body).digest('hex'), aiStatus: 'SKIPPED', docType: r.title,
        aiResult: { source: 'rules', docType: r.title, requirementCode: r.code, period: String(year), summary: `وثيقة تجريبية ضمن متطلب «${r.title}».`, keyFacts: [], factorEvidence: (r.factorIds as string[]).map(f => ({ factorId: f, suggestedLevel: Math.min(3, EX_L[f]), confidence: 0.6, rationale: 'مثال تجريبي' })), issues: [], missing: [] } });
    }
  };
  const user = async (email: string) => (await db.select().from(users).where(eq(users.email, email)))[0].id;
  const paid = async (orgId: string, aid: string, product: 'CERTIFICATE' | 'VERIFICATION_VISIT', total: number, n: number) => {
    const pid = createId(); const sub = Math.round((total / 1.15) * 100) / 100;
    await db.insert(payments).values({ id: pid, number: `PAY-${year + 1}-${String(n).padStart(4, '0')}`, orgId, assessmentId: aid, product, listPrice: total, discount: 0, subtotal: sub, vat: Math.round((total - sub) * 100) / 100, total, gateway: 'sandbox', status: 'PAID', paidAt: new Date(), providerRef: 'sandbox_' + n });
    await db.insert(invoices).values({ number: `INV-${year + 1}-${String(n).padStart(4, '0')}`, paymentId: pid, data: { seller: { name: 'كفاءة الأثر' }, buyer: { name: 'جهة تجريبية' }, items: [{ description: product === 'CERTIFICATE' ? 'رسوم التقييم المهني وشهادة كفاءة الأثر' : 'زيارة التحقق للشهادة الموثقة', qty: 1, listPrice: total, discount: 0, subtotal: sub, vat: Math.round((total - sub) * 100) / 100, total }], vatRate: 15, includesVat: true, currency: 'SAR' } });
  };

  // التقييم 1: لدى الخبير المراجع، نصف المعايير مقدّرة
  const a1 = createId();
  await db.insert(assessments).values({ id: a1, number: num(1), orgId: org1, cycleYear: year, status: 'UNDER_REVIEW', track: 'MEDIUM', expenses: 12_400_000, coverage: 0.55, progress: 100, assessorId: assessor, secondAssessorId: assessor2, revealAssessor: false, managerId: manager, submittedAt: new Date(Date.now() - 4 * 864e5), reviewStartedAt: new Date(Date.now() - 2 * 864e5) });
  await fillAnswers(a1, EX_L); await addDocs(a1, ['ANNUAL_REPORT', 'AUDITED_FS', 'PROGRAM_COSTS', 'OUTCOME_DEFINITION', 'THEORY_OF_CHANGE', 'BASELINE_DATA', 'BENEFICIARY_REGISTER', 'DATA_SYSTEM', 'PORTFOLIO', 'IMPACT_REPORT'], await user('org@demo.sa'));
  await db.insert(factorReviews).values(FACTOR_IDS.map((f, i) => ({ assessmentId: a1, factorId: f, phase: 'DESK' as const, aiLevel: Math.min(3, EX_L[f]), aiConfidence: 0.6, aiRationale: 'مقترح آلي مبني على الوثائق المرفوعة (بيانات تجريبية)', level: i % 2 === 0 ? EX_L[f] : null, reviewerId: i % 2 === 0 ? assessor : null, justification: i % 2 === 0 ? 'تحقق المقيّم من الدليل المرفوع' : null })));
  await paid(org1, a1, 'CERTIFICATE', 500, 1);
  await db.insert(messages).values([
    { assessmentId: a1, senderRole: 'ORG', senderId: await orgUser('org@demo.sa'), body: 'هل يكفي التقرير السنوي المرفوع لإثبات تعريف النتائج، أم تفضلون وثيقة مستقلة؟', orgReadAt: ago0(3), staffReadAt: ago0(2) },
    { assessmentId: a1, senderRole: 'EXPERT', senderId: assessor, body: 'يفضل رفع وثيقة مستقلة تحدد وحدة النتيجة والعتبة والمستهدف لكل برنامج رئيس، ويمكنكم الاستفادة من نموذج وثيقة تعريف النتائج.', staffReadAt: ago0(1) },
  ]);

  // التقييم 2: نتيجة غير موثقة + زيارة مدفوعة
  const L2 = { ...EX_L, F001: 3, F010: 3, F049: 3, F046: 3 };
  const r2 = evaluate(L2, 6_800_000); const s2 = snapshot(r2);
  const a2 = createId();
  await db.insert(assessments).values({ id: a2, number: num(2), orgId: org2, cycleYear: year, status: 'VERIFICATION', track: trackOf(6_800_000), expenses: 6_800_000, coverage: 0.7, progress: 100, assessorId: assessor, managerId: manager,
    submittedAt: new Date(Date.now() - 20 * 864e5), deskCompletedAt: new Date(Date.now() - 6 * 864e5), deskResult: s2 as any, deskScore: r2.total, deskLevel: r2.level, assessorSummary: 'ممارسات قياس قائمة ونتائج محسوبة لأغلب البرامج، مع حاجة إلى تحقق مستقل وتوسيع القياس التتبعي.' });
  await fillAnswers(a2, L2); await addDocs(a2, ['ANNUAL_REPORT', 'AUDITED_FS', 'PROGRAM_COSTS', 'OUTCOME_DEFINITION', 'THEORY_OF_CHANGE', 'BASELINE_DATA', 'BENEFICIARY_REGISTER', 'DATA_SYSTEM', 'PORTFOLIO'], await user('org2@demo.sa'));
  await db.insert(factorReviews).values(FACTOR_IDS.map(f => ({ assessmentId: a2, factorId: f, phase: 'DESK' as const, level: (L2 as Record<string, number>)[f], aiLevel: (L2 as Record<string, number>)[f], reviewerId: assessor, justification: 'مثبت بالوثائق المرفوعة (تجريبي)' })));
  await paid(org2, a2, 'CERTIFICATE', 500, 2); await paid(org2, a2, 'VERIFICATION_VISIT', 5000, 3);
  await db.insert(visits).values({ assessmentId: a2, status: 'PAID', preferredDates: 'الأسبوع الأول من الشهر القادم، صباحاً', location: 'مقر الجمعية — الرياض' });
  await db.insert(certificates).values({ number: `KAU-${year + 1}-0001`, assessmentId: a2, orgId: org2, type: 'UNVERIFIED', score: r2.total, level: r2.level, coverage: 0.7, periodYear: year, validUntil: new Date(Date.UTC(year + 1, 11, 31, 20, 59, 59)), verifyCode: 'DEMOSANA01', snapshot: { ...s2, orgName: 'جمعية سنا للتنمية المجتمعية', orgCity: 'الرياض', field: 'التمكين الاقتصادي والتوظيف', assessmentNumber: num(2) } as any });

  // التقييم 3: شهادة موثقة
  const L3 = Object.fromEntries(FACTOR_IDS.map(f => [f, Math.min(4, EX_L[f] + 1)]));
  L3.F003 = 3; L3.F006 = 3; const r3 = evaluate(L3, 41_000_000); const s3 = snapshot(r3);
  const a3 = createId();
  await db.insert(assessments).values({ id: a3, number: num(3), orgId: org3, cycleYear: year, status: 'CERTIFIED', track: 'LARGE', expenses: 41_000_000, coverage: 0.82, progress: 100, assessorId: assessor2, verifierId: assessor, revealAssessor: false, revealVerifier: true, managerId: manager,
    submittedAt: new Date(Date.now() - 60 * 864e5), deskCompletedAt: new Date(Date.now() - 40 * 864e5), certifiedAt: new Date(Date.now() - 10 * 864e5), deskResult: s3 as any, deskScore: r3.total, deskLevel: r3.level, finalResult: s3 as any, finalScore: r3.total, finalLevel: r3.level });
  await fillAnswers(a3, L3);
  await db.insert(factorReviews).values(FACTOR_IDS.flatMap(f => (['DESK', 'VERIFIED'] as const).map(phase => ({ assessmentId: a3, factorId: f, phase, level: L3[f], reviewerId: assessor2, justification: 'متحقق منه' }))));
  await paid(org3, a3, 'CERTIFICATE', 500, 4); await paid(org3, a3, 'VERIFICATION_VISIT', 5000, 5);
  const [v3] = await db.insert(visits).values({ assessmentId: a3, consultantId: assessor, status: 'COMPLETED', orgConfirmedAt: new Date(Date.now() - 16 * 864e5), siteContactName: 'عبدالعزيز الحربي', siteContactPhone: '0551112222', startedAt: new Date(Date.now() - 15 * 864e5), followupStatus: 'PUBLISHED', followupPublishedAt: new Date(Date.now() - 13 * 864e5), followup: { summary: 'تطابقت السجلات الميدانية مع الملفات المرفوعة في معظم الحالات المفحوصة، مع ملاحظات محدودة على توثيق المتابعة بعد انتهاء التدخل.', strengths: ['نظام بيانات موحد بصلاحيات واضحة', 'قرارات المجلس مرتبطة بنتائج القياس'], findings: ['حالة واحدة من أصل 20 دون توثيق المتابعة بعد 6 أشهر'], recommendations: ['توثيق قياس المتابعة لكل برنامج رئيس', 'أتمتة تقرير سجل المستفيدين الشهري'] }, scheduledAt: new Date(Date.now() - 15 * 864e5), completedAt: new Date(Date.now() - 14 * 864e5), location: 'مقر الجمعية — الدمام', sampleResult: { checked: 20, matched: 19, notes: 'حالة واحدة تنقصها وثيقة المتابعة' }, notes: 'تطابقت الأدلة مع الممارسة الفعلية.' }).$returningId();
    const ago = (d: number) => new Date(Date.now() - d * 864e5);
  await db.insert(visitEvents).values([
    { visitId: v3.id, type: 'requested', actorId: await orgUser('org3@demo.sa'), actorRole: 'ORG_USER', createdAt: ago(25) }, { visitId: v3.id, type: 'scheduled', actorId: manager, actorRole: 'ACCOUNT_MANAGER', createdAt: ago(18) },
    { visitId: v3.id, type: 'confirmed', actorId: await orgUser('org3@demo.sa'), actorRole: 'ORG_USER', createdAt: ago(16) }, { visitId: v3.id, type: 'started', actorId: assessor, actorRole: 'ASSESSOR', createdAt: ago(15) },
    { visitId: v3.id, type: 'completed', actorId: assessor, actorRole: 'ASSESSOR', createdAt: ago(14) }, { visitId: v3.id, type: 'followup', actorId: assessor, actorRole: 'ASSESSOR', createdAt: ago(13) },
  ] as any);
  await db.insert(certificates).values({ number: `KAC-${year + 1}-0001`, assessmentId: a3, orgId: org3, type: 'VERIFIED', score: r3.total, level: r3.level, coverage: 0.82, periodYear: year, validUntil: new Date(Date.UTC(year + 1, 11, 31, 20, 59, 59)), verifyCode: 'DEMOATHAR1', snapshot: { ...s3, orgName: 'جمعية أثر الخير الصحية', orgCity: 'الدمام', field: 'الصحة', assessmentNumber: num(3) } as any });

  // التقييم 4: بانتظار الدفع
  const a4 = createId();
  await db.insert(assessments).values({ id: a4, number: num(4), orgId: org4, cycleYear: year, status: 'AWAITING_PAYMENT', track: 'EMERGING', expenses: 1_900_000 });
  await db.insert(payments).values({ number: `PAY-${year + 1}-0006`, orgId: org4, assessmentId: a4, product: 'CERTIFICATE', listPrice: 500, discount: 0, subtotal: 434.78, vat: 65.22, total: 500 });

  await db.insert(counters).values([{ key: `PAY-${year + 1}`, value: 6 }, { key: `INV-${year + 1}`, value: 5 }, { key: `KA-${year + 1}`, value: 4 }, { key: `KAU-${year + 1}`, value: 1 }, { key: `KAC-${year + 1}`, value: 1 }]);
  await db.insert(activityLogs).values([
    { assessmentId: a1, userId: await user('org@demo.sa'), action: 'assessment.submitted' }, { assessmentId: a1, userId: manager, action: 'assessment.assigned', details: { assessor: 'د. خالد الحربي' } },
    { assessmentId: a2, userId: assessor, action: 'desk.completed', details: { total: r2.total } }, { assessmentId: a3, userId: admin, action: 'certificate.verified', details: { total: r3.total } },
  ]);
  console.log(`✓ اكتمل البذر. نتائج تجريبية: سنا ${r2.total} (${r2.level})، أثر الخير ${r3.total} (${r3.level})`);
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
