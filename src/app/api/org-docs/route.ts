import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orgDocuments, organizations, ORG_DOC_KINDS } from '@/db';
import { currentUser, ownsOrg } from '@/lib/auth';
import { saveFile, isAllowed, MAX_UPLOAD_MB } from '@/lib/storage';
import { syncOrgReadiness } from '@/lib/org';
import { logActivity } from '@/lib/notify';

/** رفع مستندات الجهة الأساسية (الترخيص، النظام الأساسي، خطاب التفويض…) */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u || u.role !== 'ORG_USER') return NextResponse.json({ error: 'سجّل الدخول' }, { status: 401 });
  const fd = await req.formData();
  const file = fd.get('file') as File | null; const orgId = String(fd.get('orgId') ?? ''); const kind = String(fd.get('kind') ?? '');
  if (!ownsOrg(u, orgId)) return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
  if (!(ORG_DOC_KINDS as readonly string[]).includes(kind)) return NextResponse.json({ error: 'نوع المستند غير معروف' }, { status: 400 });
  if (!file || !file.size) return NextResponse.json({ error: 'لا يوجد ملف' }, { status: 400 });
  if (file.size > MAX_UPLOAD_MB * 1048576) return NextResponse.json({ error: `الحد الأقصى ${MAX_UPLOAD_MB} م.ب` }, { status: 400 });
  if (!isAllowed(file)) return NextResponse.json({ error: 'نوع الملف غير مدعوم: PDF أو Word أو Excel أو صورة' }, { status: 400 });
  const saved = await saveFile(`org/${orgId}`, file);
  const [row] = await db.insert(orgDocuments).values({ orgId, kind: kind as (typeof ORG_DOC_KINDS)[number], fileName: file.name.slice(0, 250), uploadedById: u.id, ...saved }).$returningId();
  const org = (await db.select({ s: organizations.verificationStatus }).from(organizations).where(eq(organizations.id, orgId)).limit(1))[0];
  // مستند ترخيص جديد لجهة موثقة يعيدها إلى التوثيق
  await syncOrgReadiness(orgId, { userId: u.id, resetVerified: org?.s === 'VERIFIED' && kind === 'LICENSE' });
  await logActivity('org.document', { userId: u.id, details: { orgId, kind, file: file.name } });
  return NextResponse.json({ id: row.id });
}
