import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { BadgeCheck, CircleX, ShieldAlert } from 'lucide-react';
import { db, certificates } from '@/db';
import { PublicHeader, PublicFooter } from '@/components/public-shell';
import { EfficiencyLabel, ButtonLink } from '@/components/ui';
import { TRACK_LABEL } from '@/lib/domain';
import { fmtDate, fmtNum } from '@/lib/format';
import type { ScoreSnapshot } from '@/lib/scoring';

export const metadata = { title: 'نتيجة التحقق' };
export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const c = (await db.select().from(certificates).where(eq(certificates.verifyCode, decodeURIComponent(code).toUpperCase())).limit(1))[0];
  const snap = c?.snapshot as unknown as (ScoreSnapshot & { orgName: string; orgCity?: string; field?: string }) | undefined;
  const expired = c && c.validUntil < new Date();
  const valid = c && c.status === 'ACTIVE' && !expired;
  const verified = c?.type === 'VERIFIED';
  return (
    <div className="flex min-h-screen flex-col"><PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14">
        {!c ? (
          <div className="card p-10 text-center"><CircleX className="mx-auto size-14 text-rose-600" /><h1 className="mt-4 font-display text-2xl font-bold">لا توجد شهادة بهذا الرمز</h1><p className="mt-2 text-muted">تأكد من الرمز <span className="ltr font-mono">{code}</span> وأعد المحاولة.</p><ButtonLink href="/verify" className="mt-6" variant="outline">محاولة أخرى</ButtonLink></div>
        ) : (
          <div className="card overflow-hidden">
            <div className={`flex items-center gap-4 p-6 ${valid ? (verified ? 'bg-forest-950 text-white' : 'bg-amber-50') : 'bg-rose-50'}`}>
              {valid ? (verified ? <BadgeCheck className="size-12 text-lime-brand" /> : <ShieldAlert className="size-12 text-amber-600" />) : <CircleX className="size-12 text-rose-600" />}
              <div><div className="font-display text-2xl font-bold">{!valid ? (c.status === 'REVOKED' ? 'شهادة ملغاة' : 'شهادة منتهية الصلاحية') : verified ? 'شهادة موثقة سارية' : 'إفادة نتيجة غير موثقة سارية'}</div><div className={`text-sm ${valid && verified ? 'text-white/70' : 'text-muted'}`}>{verified ? 'تحقق خبير معتمد ميدانياً من أدلة الجهة' : 'صادرة بمراجعة مكتبية دون زيارة تحقق ميدانية'}{c.status === 'REVOKED' && c.revokedReason ? ` · السبب: ${c.revokedReason}` : ''}</div></div>
            </div>
            <div className="grid gap-8 p-7 md:grid-cols-[1fr_1fr]">
              <dl className="space-y-4">
                <div><dt className="text-xs text-muted">الجهة</dt><dd className="font-display text-xl font-bold">{snap?.orgName}</dd><dd className="text-sm text-muted">{[snap?.orgCity, snap?.field, snap && `المسار ${TRACK_LABEL[snap.track]}`].filter(Boolean).join(' · ')}</dd></div>
                <div className="grid grid-cols-2 gap-4"><div><dt className="text-xs text-muted">الدرجة</dt><dd className="font-display text-3xl font-black num">{fmtNum(c.score, 1)}</dd></div><div><dt className="text-xs text-muted">المستوى</dt><dd className="font-display text-xl font-bold">{c.level}</dd></div></div>
                <div className="grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-muted">الفترة المقيّمة</dt><dd className="font-semibold">السنة المالية {c.periodYear}</dd></div><div><dt className="text-xs text-muted">سارية حتى</dt><dd className="font-semibold">{fmtDate(c.validUntil)}</dd></div><div><dt className="text-xs text-muted">رقم الشهادة</dt><dd className="ltr text-right font-mono font-semibold">{c.number}</dd></div><div><dt className="text-xs text-muted">تاريخ الإصدار</dt><dd className="font-semibold">{fmtDate(c.issuedAt)}</dd></div></div>
              </dl>
              <div><EfficiencyLabel level={c.level} score={c.score} qualified={c.level !== 'قيد التأهيل'} /></div>
            </div>
            <div className="border-t border-line bg-forest-50/50 p-5 text-center text-xs text-muted">تعرض هذه الصفحة حالة الشهادة لحظياً من سجل منصة كفاءة الأثر. <Link href="/" className="font-semibold text-forest-700">عن المنهج</Link></div>
          </div>
        )}
      </main><PublicFooter /></div>
  );
}
