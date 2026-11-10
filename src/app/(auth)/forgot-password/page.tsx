import Link from 'next/link';
import { ForgotForm } from './form';
export const metadata = { title: 'استعادة كلمة المرور' };
export default function Page() {
  return (
    <>
      <h1 className="font-display text-3xl font-bold">نسيت كلمة المرور؟</h1>
      <p className="mt-2 text-muted">اكتب بريدك الإلكتروني وسنرسل لك رابطاً لاختيار كلمة مرور جديدة.</p>
      <ForgotForm />
      <p className="mt-6 text-sm text-muted">تذكّرتها؟ <Link href="/login" className="font-semibold text-forest-700 hover:underline">سجّل الدخول</Link></p>
    </>
  );
}
