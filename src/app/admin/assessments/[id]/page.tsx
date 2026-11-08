import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { Building2, ExternalLink, FileText, ListChecks, Printer } from 'lucide-react';
import { db, assessments, organizations, users, visits, payments, certificates, documents, activityLogs, factorReviews, infoRequests } from '@/db';
import { requireStaff, can } from '@/lib/auth';
import { PageHeader, Card, CardTitle, ButtonLink, Badge, Progress, LevelBadge, EfficiencyLabel } from '@/components/ui';
import { StatusBadge, JourneyTrack } from '@/components/journey';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { assignAssessment, setAssessmentStatus, scheduleVisit, issueVerifiedCertificate } from '@/app/actions/admin';
import { TRACK_LABEL, PAYMENT_STATUS_LABEL, PRODUCT_LABEL, VISIT_STATUS_LABEL, ACTION_LABEL } from '@/lib/domain';
import { fmtDate, fmtRel, fmtSAR, fileSize } from '@/lib/format';

export const metadata = { title: 'تفاصيل الطلب' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireStaff('assessments.view');
  const a = (await db.select().from(assessments).where(eq(assessments.id, id)).limit(1))[0];
  if (!a) notFound();
  const [org] = await db.select().from(organizations).where(eq(organizations.id, a.orgId));
  const staff = await db.select({ id: users.id, name: users.name, role: users.role, fv: users.isFieldVerifier }).from(users).where(and(inArray(users.role, ['ASSESSOR', 'ACCOUNT_MANAGER', 'SUPER_ADMIN']), eq(users.active, true)));
  const v = (await db.select().from(visits).where(eq(visits.assessmentId, id)).limit(1))[0];
  const pays = await db.select().from(payments).where(eq(payments.assessmentId, id)).orderBy(desc(payments.createdAt));
  const certs = await db.select().from(certificates).where(eq(certificates.assessmentId, id)).orderBy(desc(certificates.issuedAt));
  const docs = await db.select().from(documents).where(eq(documents.assessmentId, id)).orderBy(desc(documents.createdAt));
  const acts = await db.select({ l: activityLogs, who: users.name }).from(activityLogs).leftJoin(users, eq(users.id, activityLogs.userId)).where(eq(activityLogs.assessmentId, id)).orderBy(desc(activityLogs.createdAt)).limit(30);
  const reviewed = (await db.select({ l: factorReviews.level }).from(factorReviews).where(and(eq(factorReviews.assessmentId, id), eq(factorReviews.phase, 'DESK')))).filter(r => r.l != null).length;
  const openReqs = (await db.select().from(infoRequests).where(and(eq(infoRequests.assessmentId, id), eq(infoRequests.status, 'OPEN')))).length;
  const assessors = staff.filter(s => s.role === 'ASSESSOR'); const managers = staff.filter(s => s.role !== 'ASSESSOR');
  const consultants = staff.filter(s => s.role === 'ASSESSOR' && s.fv);
  const res = (a.finalResult ?? a.deskResult) as { total: number; level: string; status: string } | null;
  const toLocal = (d: Date | null) => (d ? new Date(d.getTime() + 3 * 3600e3).toISOString().slice(0, 16) : '');

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={<span className="ltr">{a.number}</span>} title={org.name} subtitle={`السنة المالية ${a.cycleYear} · المسار ${a.track ? TRACK_LABEL[a.track] : '—'} · المصروفات ${fmtSAR(a.expenses)}`}
        actions={<><StatusBadge status={a.status} /><ButtonLink href={`/assessor/assessments/${id}`} variant="outline"><ListChecks className="size-4" /> مساحة التقييم</ButtonLink>{res && <ButtonLink href={`/print/report/${id}`} target="_blank" variant="outline"><Printer className="size-4" /> التقرير</ButtonLink>}<ButtonLink href={`/admin/organizations/${org.id}`} variant="ghost"><Building2 className="size-4" /> الجهة</ButtonLink></>} />
      <JourneyTrack status={a.status} />
      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <CardTitle title="الإسناد" subtitle="المقيّم يراجع ويقدّر العوامل، والمقيّم الثاني للمراجعة المزدوجة (اختياري)" />
            {can(u, 'assessments.assign') ? (
              <ActionForm action={assignAssessment} className="mt-5 grid gap-4 sm:grid-cols-3">
                <input type="hidden" name="assessmentId" value={id} />
                <label><span className="label">المقيّم</span><select name="assessorId" defaultValue={a.assessorId ?? ''} className="input"><option value="">— لم يُسند —</option>{assessors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <label><span className="label">مقيّم ثانٍ</span><select name="secondAssessorId" defaultValue={a.secondAssessorId ?? ''} className="input"><option value="">—</option>{assessors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <label><span className="label">مدير الحساب</span><select name="managerId" defaultValue={a.managerId ?? ''} className="input"><option value="">—</option>{managers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                <div className="sm:col-span-3"><Submit>حفظ الإسناد</Submit></div>
              </ActionForm>
            ) : <p className="mt-4 text-sm text-muted">المقيّم: {staff.find(s => s.id === a.assessorId)?.name ?? '—'}</p>}
          </Card>
          <Card className="p-6">
            <CardTitle title="زيارة التحقق" action={v ? <Badge tone={VISIT_STATUS_LABEL[v.status].tone} dot>{VISIT_STATUS_LABEL[v.status].label}</Badge> : null} />
            {!v ? <p className="mt-4 text-sm text-muted">لم تطلب الجهة زيارة تحقق بعد.</p> : (
              <div className="mt-4 space-y-4">
                <div className="grid gap-3 text-sm sm:grid-cols-2"><div><span className="text-muted">الأيام المفضلة: </span>{v.preferredDates ?? '—'}</div><div><span className="text-muted">المقر: </span>{v.location ?? '—'}</div>{v.scheduledAt && <div><span className="text-muted">الموعد: </span>{fmtDate(v.scheduledAt, true)}</div>}{v.sampleResult && <div><span className="text-muted">العينة: </span><span className="num">{v.sampleResult.matched}/{v.sampleResult.checked}</span> مطابقة</div>}</div>
                {can(u, 'visits.manage') && ['PAID', 'SCHEDULED'].includes(v.status) && (
                  <ActionForm action={scheduleVisit} className="grid gap-3 rounded-2xl bg-forest-50 p-4 sm:grid-cols-3">
                    <input type="hidden" name="visitId" value={v.id} />
                    <label><span className="label">المستشار الميداني</span><select name="consultantId" defaultValue={v.consultantId ?? ''} className="input"><option value="">اختر</option>{consultants.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
                    <label><span className="label">الموعد (بتوقيت الرياض)</span><input type="datetime-local" name="scheduledAt" defaultValue={toLocal(v.scheduledAt)} className="input ltr" /></label>
                    <label><span className="label">المقر</span><input name="location" defaultValue={v.location ?? ''} className="input" /></label>
                    <div className="sm:col-span-3"><Submit>{v.status === 'SCHEDULED' ? 'تحديث الموعد' : 'جدولة الزيارة'}</Submit></div>
                  </ActionForm>
                )}
                {v.status === 'COMPLETED' && a.status === 'VERIFICATION' && can(u, 'certificates.issue') && (
                  <ActionForm action={issueVerifiedCertificate} className="rounded-2xl bg-lime-100/60 p-4">
                    <input type="hidden" name="assessmentId" value={id} />
                    <p className="mb-3 text-sm">أنهى المستشار الزيارة وعدّل المستويات. راجع مساحة التقييم ثم اعتمد الشهادة الموثقة.</p>
                    <Submit variant="lime">اعتماد وإصدار الشهادة الموثقة</Submit>
                  </ActionForm>
                )}
              </div>
            )}
          </Card>
          {can(u, 'assessments.manage') && (
            <Card className="p-6">
              <CardTitle title="إدارة الحالة" subtitle="إعادة فتح الطلب للجهة، أو إعادته للمراجعة، أو إلغاؤه" />
              <ActionForm action={setAssessmentStatus} className="mt-4 grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
                <input type="hidden" name="assessmentId" value={id} />
                <select name="status" className="input"><option value="DATA_COLLECTION">إعادة فتح للجهة</option><option value="UNDER_REVIEW">إعادة للمراجعة</option><option value="CANCELLED">إلغاء الطلب</option></select>
                <input name="note" className="input" placeholder="ملاحظة تصل للجهة" />
                <Submit variant="outline">تطبيق</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <CardTitle title="التقدم والنتيجة" />
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-forest-50 p-4"><div className="text-xs text-muted">اكتمال ملف الجهة</div><div className="font-display text-2xl font-bold num">{a.progress}٪</div><Progress value={a.progress} className="mt-2" /></div>
              <div className="rounded-2xl bg-forest-50 p-4"><div className="text-xs text-muted">عوامل مقدّرة</div><div className="font-display text-2xl font-bold num">{reviewed}/56</div><Progress value={(reviewed / 56) * 100} className="mt-2" /></div>
              <div className="rounded-2xl bg-forest-50 p-4"><div className="text-xs text-muted">استيضاحات مفتوحة</div><div className="font-display text-2xl font-bold num">{openReqs}</div></div>
            </div>
            {res && <div className="mt-5 grid items-center gap-5 sm:grid-cols-[1fr_auto]"><EfficiencyLabel level={res.level} score={res.total} compact qualified={res.status === 'مؤهل'} /><div className="space-y-1 text-sm"><div>المكتبية: <b className="num">{a.deskScore ?? '—'}</b> <LevelBadge level={a.deskLevel} /></div>{a.finalScore != null && <div>الموثقة: <b className="num">{a.finalScore}</b> <LevelBadge level={a.finalLevel} /></div>}</div></div>}
            {certs.length > 0 && <ul className="mt-5 divide-y divide-line rounded-2xl border border-line">{certs.map(c => <li key={c.id} className="flex items-center gap-3 p-3 text-sm"><span className="ltr font-mono text-xs">{c.number}</span><Badge tone={c.type === 'VERIFIED' ? 'green' : 'amber'}>{c.type === 'VERIFIED' ? 'موثقة' : 'غير موثقة'}</Badge>{c.status !== 'ACTIVE' && <Badge tone="rose">ملغاة</Badge>}<span className="flex-1" /><Link href={`/print/certificate/${c.id}`} target="_blank" className="text-forest-700 hover:underline"><ExternalLink className="inline size-4" /></Link></li>)}</ul>}
          </Card>
          <Card className="p-6">
            <CardTitle title="المدفوعات" />
            <ul className="mt-4 divide-y divide-line">{pays.map(p => <li key={p.id} className="flex items-center gap-3 py-2.5 text-sm"><span className="ltr font-mono text-xs">{p.number}</span><span className="flex-1">{PRODUCT_LABEL[p.product]}</span><b className="num">{fmtSAR(p.total)}</b><Badge tone={PAYMENT_STATUS_LABEL[p.status].tone}>{PAYMENT_STATUS_LABEL[p.status].label}</Badge></li>)}{!pays.length && <li className="text-sm text-muted">—</li>}</ul>
          </Card>
          <Card className="p-6">
            <CardTitle title={`الملفات (${docs.length})`} />
            <ul className="mt-4 max-h-72 divide-y divide-line overflow-y-auto">{docs.map(d => <li key={d.id}><a href={`/api/files/${d.id}`} target="_blank" className="flex items-center gap-3 py-2 text-sm hover:text-forest-700"><FileText className="size-4 shrink-0 text-forest-600" /><span className="min-w-0 flex-1 truncate">{d.fileName}</span><span className="text-xs text-muted">{fileSize(d.size)}</span><Badge tone={d.aiStatus === 'DONE' ? 'green' : 'slate'}>{d.aiStatus === 'DONE' ? 'محلّل' : d.aiStatus === 'FAILED' ? 'فشل' : 'مفهرس'}</Badge></a></li>)}</ul>
          </Card>
          <Card className="p-6">
            <CardTitle title="سجل الطلب" />
            <ol className="mt-4 space-y-2.5 text-sm">{acts.map(({ l, who }) => <li key={l.id} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-forest-500" /><span className="flex-1"><b>{ACTION_LABEL[l.action] ?? l.action}</b> · {who ?? 'النظام'}</span><span className="text-xs text-muted">{fmtRel(l.createdAt)}</span></li>)}</ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
