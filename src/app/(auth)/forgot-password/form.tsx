'use client';
import { useActionState } from 'react';
import { forgotPasswordAction } from '@/app/actions/auth';
import { Submit, FormMessage } from '@/components/client/submit';

export function ForgotForm() {
  const [s, action] = useActionState(forgotPasswordAction, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <FormMessage state={s} />
      <label className="block"><span className="label">البريد الإلكتروني المسجّل</span><input name="email" type="email" required defaultValue={s?.fields?.email} className="input ltr text-left" autoComplete="email" /></label>
      <Submit className="w-full" size="lg" pendingText="جارٍ الإرسال…">أرسل رابط الاستعادة</Submit>
    </form>
  );
}
