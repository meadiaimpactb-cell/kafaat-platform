'use client';
import { useActionState } from 'react';
import { registerAction } from '@/app/actions/auth';
import { Submit, FormMessage } from '@/components/client/submit';

export function RegisterForm() {
  const [s, action] = useActionState(registerAction, undefined);
  const f = s?.fields ?? {};
  return (
    <form action={action} className="mt-8 space-y-4">
      <FormMessage state={s} />
      <label className="block"><span className="label">اسم الجهة</span><input name="orgName" required defaultValue={f.orgName} className="input" placeholder="مثال: جمعية … الخيرية" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block"><span className="label">اسم المسؤول</span><input name="name" required defaultValue={f.name} className="input" /></label>
        <label className="block"><span className="label">رقم الجوال</span><input name="phone" required defaultValue={f.phone} className="input ltr text-left" placeholder="05xxxxxxxx" /></label>
      </div>
      <label className="block"><span className="label">البريد الإلكتروني</span><input name="email" type="email" required defaultValue={f.email} className="input ltr text-left" /></label>
      <label className="block"><span className="label">كلمة المرور</span><input name="password" type="password" required minLength={8} className="input ltr text-left" /><span className="mt-1 block text-xs text-muted">8 أحرف على الأقل</span></label>
      <label className="flex items-start gap-2 text-sm text-ink-2"><input type="checkbox" name="agree" className="mt-1 size-4 accent-[#0B5233]" />أوافق على شروط استخدام المنصة وسياسة الخصوصية، وأقر بصحة البيانات التي سأقدمها.</label>
      <Submit className="w-full" size="lg" pendingText="جارٍ إنشاء الحساب…">إنشاء الحساب والمتابعة</Submit>
    </form>
  );
}
