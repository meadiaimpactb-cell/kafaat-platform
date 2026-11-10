import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { desc, eq, inArray, and } from 'drizzle-orm';
import { CheckCircle2, Circle, Eye, ShieldCheck } from 'lucide-react';
import { db, organizations, organizationMembers, users, assessments, payments, certificates } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { loadReadiness, ORG_DOC_META, VERIFICATION_LABEL } from '@/lib/org';
import { PageHeader, Card, CardTitle, Badge, LevelBadge } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveOrgAdmin, verifyOrg, rejectOrg } from '@/app/actions/admin';
import { TRACK_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_LABEL } from '@/lib/domain';
import { fmtDate, fmtSAR, fmtNum, fileSize } from '@/lib/format';

export const metadata = { title: 'ملف الجهة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const u = await requireStaff();
  if (!can(u, 'orgs.view') && !can(u, 'orgs.verify')) redirect('/admin?denied=1');
  const r = await loadReadiness(id); if (!r) notFound();
  const o = r.org; const vs = VERIFICATION_LABEL[o.verificationStatus];
  const members = await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, active: users.active, role: organizationMembers.role, last: users.lastLoginAt }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(eq(organizationMembers.orgId, id));
  const verifier = o.verifiedById ? (await db.select({ n: users.name }).from(users).where(eq(users.id, o.verifiedById)).limit(1))[0]?.n : null;
  const managers = await db.select({ id: users.id, name: users.name }).from(users).where(and(inArray(users.role, ['ACCOUNT_MANAGER', 'SUPER_ADMIN']), eq(users.active, true)));
  const as = await db.select().from(assessments).where(eq(assessments.orgId, id)).orderBy(desc(assessments.createdAt));
  const pays = await db.select().from(payments).where(eq(payments.orgId, id)).orderBy(desc(payments.createdAt));
  const certs = await db.select().from(certificates).where(eq(certificates.orgId, id)).orderBy(desc(certificates.issuedAt));
  const d = (x: Date | null) => (x ? fmtDate(x) : null);
  const info: [string, unknown][] = [['رقم الترخيص', o.licenseNo], ['جهة الترخيص', o.licenseIssuer], ['تاريخ الإصدار', d(o.licenseIssueDate)], ['تاريخ الانتهاء', d(o.licenseExpiry) ?? 'بلا انتهاء'], ['الرقم الموحد', o.unifiedNo], ['النوع', o.orgType], ['المنطقة', o.region], ['المدينة', o.city], ['العنوان', o.address], ['العنوان الوطني', o.nationalAddress], ['المجال', o.field], ['سنة التأسيس', o.foundedYear], ['المسار', o.track ? TRACK_LABEL[o.track] : null], ['مصروفات العام الماضي', fmtSAR(o.lastYearExpenses)], ['الإيرادات', fmtSAR(o.lastYearRevenue)], ['مصروفات البرامج', fmtSAR(o.programExpenses)], ['المستفيدون', fmtNum(o.beneficiariesCount)], ['البرامج', o.programsCount], ['الموظفون', o.employeesCount], ['المتطوعون', o.volunteersCount], ['البريد', o.email], ['الهاتف', o.phone], ['الموقع', o.website]];
  const rep: [string, unknown][] = [['الممثل المفوض', o.repName], ['الصفة', o.repTitle], ['الجوال', o.repPhone], ['البريد', o.repEmail], ['مسؤول التواصل', o.contactName && `${o.contactName}${o.contactTitle ? ' — ' + o.contactTitle : ''}`]];
  const canVerify = can(u, 'orgs.verify');
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<Badge tone={vs.tone} dot>{vs.label}</Badge>} title={o.name} subtitle={o.nameEn ?? undefined} />

      <Card className="p-6">
        <CardTitle title="التوثيق ومطابقة المستندات" subtitle="يلزم قبل زيارة التحقق والشهادة الموثقة. لا يتوقف عليه تقديم طلب التقييم." icon={<ShieldCheck className="size-5" />} />
        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="text-sm font-semibold">المستندات المرفوعة</div>
            <ul className="space-y-2">
              {Object.entries(ORG_DOC_META).map(([kind, m]) => { const mine = r.docs.filter(x => x.kind === kind); return (
                <li key={kind} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-center gap-2">{mine.length ? <CheckCircle2 className="size-4 text-forest-700" /> : <Circle className={`size-4 ${m.required ? 'text-orange-brand' : 'text-slate-300'}`} />}<span className="font-semibold">{m.label}</span>{m.required && !mine.length && <Badge tone="orange">مطلوب ولم يُرفع</Badge>}</div>
                  {mine.map(f => <a key={f.id} href={`/api/org-docs/${f.id}`} target="_blank" className="mt-2 flex items-center gap-2 rounded-lg bg-forest-50 px-3 py-2 text-xs hover:bg-forest-100"><Eye className="size-3.5" /><span className="min-w-0 flex-1 truncate">{f.fileName}</span><span className="text-muted">{fileSize(f.size)} · {fmtDate(f.createdAt)}</span></a>)}
                </li>); })}
            </ul>
            {!r.complete && <div className="rounded-xl bg-orange-50 p-3 text-xs leading-6 text-orange-950">الملف غير مكتمل: {[...r.missingFields.map(f => f.label), ...r.missingDocs.map(d => d.label)].join('، ') || 'الترخيص منتهي'}{r.expired ? ' · الترخيص منتهي الصلاحية' : ''}</div>}
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl bg-forest-50 p-4 text-sm">
              <div className="mb-1 text-xs text-muted">الحالة الحالية</div><div className="font-semibold">{vs.label}</div>
              <p className="mt-1 text-xs leading-6 text-muted">{vs.hint}</p>
              {o.verifiedAt && <p className="mt-1 text-xs text-forest-800">وُثّقت في {fmtDate(o.verifiedAt)}{verifier ? ` بواسطة ${verifier}` : ''}</p>}
              {o.submittedForVerificationAt && o.verificationStatus === 'PENDING' && <p className="mt-1 text-xs text-muted">قُدمت للتوثيق في {fmtDate(o.submittedForVerificationAt)}</p>}
              {o.verificationNote && <p className="mt-2 rounded-lg bg-white p-2 text-xs">ملاحظة: {o.verificationNote}</p>}
            </div>
            {canVerify ? (
              <>
                <ActionForm action={verifyOrg} className="space-y-3 rounded-2xl border border-line p-4">
                  <input type="hidden" name="orgId" value={o.id} />
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="matched" className="mt-1" /> طابقتُ الاسم ورقم الترخيص وجهة الإصدار والتواريخ مع صورة الترخيص، وراجعتُ خطاب تفويض الممثل.</label>
                  <input name="note" className="input" placeholder="ملاحظة داخلية (اختياري)" />
                  <Submit variant="lime" disabled={!r.complete}>{o.verificationStatus === 'VERIFIED' ? 'إعادة اعتماد التوثيق' : 'توثيق الجهة'}</Submit>
                  {!r.complete && <p className="text-xs text-muted">لا يمكن التوثيق قبل اكتمال البيانات والمستندات.</p>}
                </ActionForm>
                <ActionForm action={rejectOrg} className="space-y-3 rounded-2xl border border-line p-4">
                  <input type="hidden" name="orgId" value={o.id} />
                  <textarea name="note" rows={2} className="input" placeholder="ما الذي يجب على الجهة تصحيحه؟ (تصلها هذه الملاحظة)" />
                  <Submit variant="outline">إعادة للتصحيح</Submit>
                </ActionForm>
              </>
            ) : <p className="text-sm text-muted">لا تملك صلاحية توثيق الجهات.</p>}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card className="p-6"><CardTitle title="البيانات الرئيسة" /><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">{info.map(([k, v]) => <div key={k} className="rounded-xl bg-forest-50 p-3"><dt className="text-xs text-muted">{k}</dt><dd className="break-words font-semibold">{(v as string) ?? '—'}</dd></div>)}</dl>{o.description && <p className="mt-4 text-sm leading-7 text-ink-2">{o.description}</p>}</Card>
          <Card className="p-6"><CardTitle title="الممثل المفوض والتواصل" /><dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">{rep.map(([k, v]) => <div key={k} className="rounded-xl bg-forest-50 p-3"><dt className="text-xs text-muted">{k}</dt><dd className="break-words font-semibold">{(v as string) ?? '—'}</dd></div>)}</dl></Card>
        </div>
        <div className="space-y-6">
          <Card className="p-6"><CardTitle title="مدير الحساب" />{can(u, 'orgs.manage') ? <ActionForm action={saveOrgAdmin} className="mt-4 flex gap-2"><input type="hidden" name="id" value={o.id} /><select name="accountManagerId" defaultValue={o.accountManagerId ?? ''} className="input flex-1"><option value="">—</option>{managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><Submit>حفظ</Submit></ActionForm> : <p className="mt-3 text-sm">{managers.find(m => m.id === o.accountManagerId)?.name ?? '—'}</p>}</Card>
          <Card className="p-6"><CardTitle title="مستخدمو الجهة" subtitle="حساب واحد قد يدير عدة جهات" /><ul className="mt-4 space-y-2 text-sm">{members.map(m => <li key={m.id} className="flex items-center justify-between rounded-xl bg-forest-50 p-3"><div><div className="font-semibold">{m.name}{m.role === 'OWNER' && <span className="ms-2 text-xs font-normal text-muted">مالك</span>}</div><div className="ltr text-right text-xs text-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</div></div>{!m.active && <Badge tone="rose">معطل</Badge>}</li>)}</ul></Card>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-6"><CardTitle title="الطلبات" /><ul className="mt-4 space-y-2">{as.map(a => <li key={a.id}><Link href={`/admin/assessments/${a.id}`} className="flex items-center justify-between rounded-xl border border-line p-3 text-sm hover:border-forest-500"><span><span className="ltr font-mono text-xs">{a.number}</span> · {a.cycleYear}</span><StatusBadge status={a.status} /></Link></li>)}{!as.length && <li className="text-sm text-muted">لا طلبات</li>}</ul></Card>
        <Card className="p-6"><CardTitle title="المدفوعات" /><ul className="mt-4 divide-y divide-line text-sm">{pays.map(p => <li key={p.id} className="flex items-center justify-between py-2"><span>{PRODUCT_LABEL[p.product]}<span className="block text-xs text-muted">{fmtDate(p.createdAt)}</span></span><span className="text-left"><b className="num">{fmtSAR(p.total)}</b><span className="block"><Badge tone={PAYMENT_STATUS_LABEL[p.status].tone}>{PAYMENT_STATUS_LABEL[p.status].label}</Badge></span></span></li>)}{!pays.length && <li className="py-2 text-muted">لا مدفوعات</li>}</ul></Card>
        <Card className="p-6"><CardTitle title="الشهادات" /><ul className="mt-4 space-y-2 text-sm">{certs.map(c => <li key={c.id}><Link href={`/print/certificate/${c.id}`} target="_blank" className="flex items-center justify-between rounded-xl bg-forest-50 p-3"><span className="ltr font-mono text-xs">{c.number}</span><span className="flex items-center gap-2"><b className="num">{c.score}</b><LevelBadge level={c.level} /></span></Link></li>)}{!certs.length && <li className="text-muted">لا شهادات</li>}</ul></Card>
      </div>
    </div>
  );
}
