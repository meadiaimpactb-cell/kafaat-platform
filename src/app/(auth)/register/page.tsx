import Link from 'next/link';
import { RegisterForm } from './form';
export const metadata = { title: 'تسجيل جهة' };
export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">سجّل جهتك</h1>
      <p className="mt-2 text-muted">دقيقتان لإنشاء الحساب، ثم نكمل معك بيانات الجهة خطوة بخطوة.</p>
      <RegisterForm />
      <p className="mt-6 text-sm text-muted">لديك حساب؟ <Link href="/login" className="font-semibold text-forest-700 hover:underline">سجّل الدخول</Link></p>
    </>
  );
}
