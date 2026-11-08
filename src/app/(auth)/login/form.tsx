'use client';
import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';
import { Submit, FormMessage } from '@/components/client/submit';

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <FormMessage state={state} />
      <label className="block"><span className="label">البريد الإلكتروني</span><input name="email" type="email" required defaultValue={state?.fields?.email} className="input ltr text-left" autoComplete="email" /></label>
      <label className="block"><span className="label">كلمة المرور</span><input name="password" type="password" required className="input ltr text-left" autoComplete="current-password" /></label>
      <Submit className="w-full" size="lg" pendingText="جارٍ الدخول…">دخول</Submit>
    </form>
  );
}
