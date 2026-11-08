import Link from 'next/link';
import { LoginForm } from './form';
export const metadata = { title: 'تسجيل الدخول' };
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-bold">مرحباً بعودتك</h1>
      <p className="mt-2 text-muted">سجّل الدخول لمتابعة تقييم جهتك أو مهامك.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-sm text-muted">ليس لديك حساب؟ <Link href="/register" className="font-semibold text-forest-700 hover:underline">سجّل جهتك</Link></p>
    </>
  );
}
