import 'server-only';
import { eq } from 'drizzle-orm';
import { db, organizations, orgDocuments } from '@/db';
import { notifyStaff, logActivity } from './notify';

export * from './org-meta';
import { ORG_DOC_META } from './org-meta';

type Org = typeof organizations.$inferSelect;
/** الحقول الإلزامية قبل تقديم أي طلب تقييم */
const REQUIRED_FIELDS: { key: keyof Org; label: string }[] = [
  { key: 'name', label: 'اسم الجهة' }, { key: 'orgType', label: 'نوع الجهة' }, { key: 'licenseNo', label: 'رقم الترخيص' },
  { key: 'licenseIssuer', label: 'جهة الترخيص' }, { key: 'licenseIssueDate', label: 'تاريخ إصدار الترخيص' },
  { key: 'field', label: 'المجال الرئيس' }, { key: 'region', label: 'المنطقة' }, { key: 'city', label: 'المدينة' }, { key: 'address', label: 'عنوان الجهة' },
  { key: 'email', label: 'البريد الرسمي' }, { key: 'phone', label: 'هاتف الجهة' },
  { key: 'repName', label: 'اسم الممثل المفوض' }, { key: 'repTitle', label: 'صفة الممثل' }, { key: 'repPhone', label: 'جوال الممثل' }, { key: 'repEmail', label: 'بريد الممثل' },
  { key: 'lastYearExpenses', label: 'إجمالي مصروفات آخر سنة مالية' },
];

export function orgReadiness(org: Org, docKinds: string[]) {
  const missingFields = REQUIRED_FIELDS.filter(f => { const v = org[f.key]; return v == null || v === '' || v === 0; }).map(f => ({ key: f.key as string, label: f.label }));
  const missingDocs = Object.entries(ORG_DOC_META).filter(([k, m]) => m.required && !docKinds.includes(k)).map(([k, m]) => ({ kind: k, label: m.label }));
  const total = REQUIRED_FIELDS.length + Object.values(ORG_DOC_META).filter(m => m.required).length;
  const done = total - missingFields.length - missingDocs.length;
  const expired = !!(org.licenseExpiry && org.licenseExpiry < new Date());
  return { complete: !missingFields.length && !missingDocs.length && !expired, missingFields, missingDocs, expired, percent: Math.round((done / total) * 100) };
}

export async function loadReadiness(orgId: string) {
  const org = (await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1))[0];
  if (!org) return null;
  const docs = await db.select().from(orgDocuments).where(eq(orgDocuments.orgId, orgId));
  return { org, docs, ...orgReadiness(org, docs.map(d => d.kind)) };
}

/**
 * مزامنة حالة الاكتمال والتوثيق بعد أي تعديل على بيانات الجهة أو مستنداتها.
 * لا يتوقف التقديم على موافقة الإدارة؛ لكن التوثيق (VERIFIED) لازم قبل زيارة التحقق والشهادة الموثقة.
 */
export async function syncOrgReadiness(orgId: string, opts: { userId?: string; resetVerified?: boolean } = {}) {
  const r = await loadReadiness(orgId);
  if (!r) return null;
  const { org } = r; const patch: Partial<Org> = { profileCompleted: r.complete };
  if (r.complete) {
    const resubmit = org.verificationStatus === 'UNVERIFIED' || org.verificationStatus === 'REJECTED' || (org.verificationStatus === 'VERIFIED' && opts.resetVerified);
    if (resubmit) {
      patch.verificationStatus = 'PENDING'; patch.submittedForVerificationAt = new Date();
      if (org.verificationStatus === 'VERIFIED') { patch.verifiedAt = null; patch.verificationNote = 'أُعيد التوثيق بعد تعديل بيانات أساسية'; }
      await notifyStaff('جهة بانتظار التوثيق', org.name, `/admin/organizations/${orgId}`);
      await logActivity('org.submitted', { userId: opts.userId, details: { orgId, name: org.name } });
    }
  } else if (org.verificationStatus === 'PENDING' || org.verificationStatus === 'VERIFIED') { patch.verificationStatus = 'UNVERIFIED'; patch.verifiedAt = null; } // نقص بيانات أو مستند يُبطل التوثيق
  await db.update(organizations).set(patch).where(eq(organizations.id, orgId));
  return r;
}

