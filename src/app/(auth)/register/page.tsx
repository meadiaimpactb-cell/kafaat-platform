import Link from 'next/link';
import { RegisterForm } from './form';
import { SocialButtons } from '@/components/social-buttons';
export const metadata = { title: 'إنشاء حساب' };
export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">أنشئ حسابك</h1>
      <p className="mt-2 text-muted">حساب شخصي واحد يكفي لإدارة جهة أو أكثر. بعد التسجيل تضيف بيانات جهتك وترخيصها ثم تقدّم طلب التقييم.</p>
      <RegisterForm />
      <SocialButtons verb="التسجيل" />
      <p className="mt-6 text-sm text-muted">لديك حساب؟ <Link href="/login" className="font-semibold text-forest-700 hover:underline">سجّل الدخول</Link></p>
    </>
  );
}
