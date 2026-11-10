import Link from 'next/link';
import { LoginForm } from './form';
import { SocialButtons } from '@/components/social-buttons';
export const metadata = { title: 'تسجيل الدخول' };

const SOCIAL_ERR: Record<string, string> = {
  disabled: 'الدخول عبر هذا المزوّد غير مفعّل حالياً. استخدم البريد وكلمة المرور.', denied: 'ألغيت عملية الدخول. يمكنك المحاولة مرة أخرى.', state: 'انتهت جلسة الدخول، حاول مرة أخرى.',
  exchange: 'تعذر إكمال الدخول لدى المزوّد. حاول مرة أخرى.', code: 'تعذر إكمال الدخول. حاول مرة أخرى.', unknown: 'مزوّد غير معروف.',
};
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string; social_error?: string; msg?: string; p?: string }> }) {
  const { next, reset, social_error, msg } = await searchParams;
  const err = social_error ? (social_error === 'custom' ? msg : SOCIAL_ERR[social_error]) : null;
  return (
    <>
      <h1 className="font-display text-3xl font-bold">مرحباً بعودتك</h1>
      <p className="mt-2 text-muted">سجّل الدخول لمتابعة تقييم جهتك أو مهامك.</p>
      {reset && <div className="mt-6 rounded-xl bg-forest-100 px-4 py-3 text-sm font-medium text-forest-800 ring-1 ring-forest-300">تم تغيير كلمة المرور. سجّل الدخول بكلمتك الجديدة.</div>}
      {err && <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200">{err}</div>}
      <LoginForm next={next} />
      <SocialButtons next={next} verb="الدخول" />
      <p className="mt-6 text-sm text-muted">ليس لديك حساب؟ <Link href="/register" className="font-semibold text-forest-700 hover:underline">أنشئ حساباً</Link></p>
    </>
  );
}
