'use client';
import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

/** حقل كلمة المرور مع زر إظهار/إخفاء ما يكتبه المستخدم */
export function PasswordInput({ className, ...p }: Omit<ComponentProps<'input'>, 'type'>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...p} type={show ? 'text' : 'password'} className={cn('input ltr pl-12 text-left', className)} />
      <button type="button" onClick={() => setShow(s => !s)} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} aria-pressed={show} title={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        className="absolute inset-y-0 left-0 grid w-11 place-items-center rounded-l-xl text-muted hover:text-forest-800">
        {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}
