import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { AlertTriangle, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import { requireUser, ownsOrg } from '@/lib/auth';
import { db, organizations } from '@/db';
import { loadReadiness, ORG_DOC_META, VERIFICATION_LABEL } from '@/lib/org';
import { MAX_UPLOAD_MB } from '@/lib/storage';
import { PageHeader, Card, CardTitle, Badge, ButtonLink } from '@/components/ui';
import { OnboardingForm } from './form';
import { OrgDocsPanel } from '@/components/portal/org-docs-panel';

export const metadata = { title: 'بيانات الجهة' };
export default async function Page({ searchParams }: { searchParams: Promise<{ org?: string; new?: string; need?: string; saved?: string }> }) {
  const sp = await searchParams;
  const u = await requireUser(['ORG_USER']);
  // وضع الإنشاء: ‎?new=1‎ أو حساب بلا أي جهة بعد
  const creating = sp.new === '1' || !u.orgs.length;
  const targetId = creating ? null : (sp.org && ownsOrg(u, sp.org) ? sp.org : u.orgId);
  const r = targetId ? await loadReadiness(targetId) : null;
  const o = r?.org ?? null;
  const vs = o ? VERIFICATION_LABEL[o.verificationStatus] : null;
  const locked = false;
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        eyebrow={creating ? 'إضافة جهة' : o?.profileCompleted ? 'بيانات الجهة' : 'قبل تقديم الطلب'}
        title={creating ? (u.orgs.length ? 'إضافة جهة جديدة إلى حسابك' : 'لنتعرف على جهتك') : o!.name}
        subtitle="تُطلب هذه البيانات والمستندات مرة واحدة لكل جهة، كما في منصات المانحين والجهات الإشرافية، ولا تنتظر موافقة الإدارة لتقديم طلبك. توثيق الجهة يُراجَع لاحقاً ويلزم قبل زيارة التحقق والشهادة الموثقة."
        actions={u.orgs.length > 1 || !creating ? <ButtonLink href="/portal/organizations" variant="outline">جهاتي</ButtonLink> : undefined}
      />

      {sp.need === '1' && r && !r.complete && <div className="flex items-start gap-3 rounded-2xl bg-orange-50 p-4 text-sm leading-7 text-orange-950 ring-1 ring-orange-200"><AlertTriangle className="mt-1 size-5 shrink-0 text-orange-brand" /> لا يمكن تقديم طلب التقييم قبل استكمال بيانات الجهة ومستنداتها الأساسية. أكملها من القوائم أدناه ثم عد لتقديم الطلب.</div>}
      {sp.saved === '1' && <div className="rounded-2xl bg-forest-100 p-4 text-sm text-forest-900 ring-1 ring-forest-300">حُفظت بيانات الجهة. ارفع الآن المستندات المطلوبة أدناه.</div>}

      {r && o && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><div className="text-xs text-muted">جاهزية تقديم الطلب</div><div className="font-display text-4xl font-black num">{r.percent}<span className="text-lg text-muted">%</span></div></div>
            <div className="flex items-center gap-3">
              {vs && <div className="text-left"><div className="text-xs text-muted">حالة التوثيق</div><Badge tone={vs.tone} dot>{vs.label}</Badge></div>}
              {r.complete && <ButtonLink href="/portal/assessments/new" variant="lime">تقديم طلب التقييم</ButtonLink>}
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest-100"><div className="spectrum-rtl h-full transition-all" style={{ width: `${r.percent}%` }} /></div>
          {vs && <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-forest-700" /> {vs.hint}{o.verificationStatus === 'REJECTED' && o.verificationNote ? ` — ملاحظة الإدارة: ${o.verificationNote}` : ''}</p>}
          {!r.complete && (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {[...r.missingFields.map(f => ({ k: f.key, l: f.label, t: 'بيان' })), ...r.missingDocs.map(d => ({ k: d.kind, l: d.label, t: 'مستند' }))].map(x => <div key={x.k} className="flex items-center gap-2 text-sm text-ink-2"><Circle className="size-4 text-orange-brand" /> {x.l} <span className="text-xs text-muted">({x.t})</span></div>)}
              {r.expired && <div className="flex items-center gap-2 text-sm text-rose-700"><AlertTriangle className="size-4" /> الترخيص منتهي؛ حدّث تاريخ الانتهاء أو ارفع ترخيصاً ساري المفعول</div>}
            </div>
          )}
          {r.complete && <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-forest-800"><CheckCircle2 className="size-4" /> بيانات الجهة ومستنداتها الأساسية مكتملة</div>}
        </Card>
      )}

      <OnboardingForm key={targetId ?? 'new'} org={o ? JSON.parse(JSON.stringify(o)) : {}} orgId={targetId} complete={!!r?.complete} />

      <section id="docs" className="scroll-mt-24 space-y-4">
        <CardTitle title="مستندات الجهة" subtitle={`ارفع ملفات PDF أو Word أو Excel أو صوراً، بحد أقصى ${MAX_UPLOAD_MB} م.ب للملف`} />
        {targetId && r ? (
          <OrgDocsPanel orgId={targetId} meta={ORG_DOC_META} maxMb={MAX_UPLOAD_MB} locked={locked} docs={r.docs.map(d => ({ id: d.id, kind: d.kind, fileName: d.fileName, size: d.size, createdAt: d.createdAt.toISOString() }))} />
        ) : <Card className="p-6 text-sm text-muted">احفظ بيانات الجهة أولاً لتظهر خانات رفع المستندات (الترخيص، النظام الأساسي، خطاب التفويض).</Card>}
        <p className="text-xs leading-6 text-muted">تُحفظ المستندات بسرية ولا يطّلع عليها إلا فريق التوثيق، وتُستخدم لمطابقة بيانات الجهة قبل اعتماد توثيقها.</p>
        {targetId && <p className="text-sm"><Link href="/portal/organizations" className="font-semibold text-forest-800 hover:underline">إدارة الجهات المرتبطة بحسابي ←</Link></p>}
      </section>
    </div>
  );
}
