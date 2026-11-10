'use client';
import { useActionState } from 'react';
import { resetPasswordAction } from '@/app/actions/auth';
import { Submit, FormMessage } from '@/components/client/submit';
import { PasswordInput } from '@/components/client/password-input';

export function ResetForm({ token }: { token: string }) {
  const [s, action] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="mt-8 space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={s} />
      <label className="block"><span className="label">كلمة المرور الجديدة</span><PasswordInput name="password" required minLength={8} autoComplete="new-password" /><span className="mt-1 block text-xs text-muted">8 أحرف على الأقل</span></label>
      <label className="block"><span className="label">تأكيد كلمة المرور</span><PasswordInput name="password2" required minLength={8} autoComplete="new-password" /></label>
      <Submit className="w-full" size="lg" pendingText="جارٍ الحفظ…">حفظ كلمة المرور</Submit>
    </form>
  );
}
