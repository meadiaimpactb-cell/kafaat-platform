import { ButtonLink } from '@/components/ui';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, passwordResets } from '@/db';
import { sha256 } from '@/lib/crypto';
import { ResetForm } from './form';
export const metadata = { title: 'كلمة مرور جديدة' };
export const dynamic = 'force-dynamic';
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = (await db.select({ id: passwordResets.id }).from(passwordResets).where(and(eq(passwordResets.tokenHash, sha256(token)), isNull(passwordResets.usedAt), gt(passwordResets.expiresAt, new Date()))).limit(1)).length > 0;
  if (!ok) return (
    <>
      <h1 className="font-display text-3xl font-bold">الرابط غير صالح</h1>
      <p className="mt-2 text-muted">انتهت صلاحية رابط الاستعادة أو سبق استخدامه. اطلب رابطاً جديداً.</p>
      <ButtonLink href="/forgot-password" className="mt-6">طلب رابط جديد</ButtonLink>
    </>
  );
  return (
    <>
      <h1 className="font-display text-3xl font-bold">اختر كلمة مرور جديدة</h1>
      <p className="mt-2 text-muted">بعد الحفظ ستُنهى كل الجلسات المفتوحة ويلزم تسجيل الدخول من جديد.</p>
      <ResetForm token={token} />
    </>
  );
}
