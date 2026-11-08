'use client';
import { useFormStatus } from 'react-dom';
import { createContext, startTransition, useActionState, useContext, type FormEvent } from 'react';
import type { FormState } from '@/app/actions/auth';
import { Loader2 } from 'lucide-react';
import { Button } from '../ui';
import type { ComponentProps } from 'react';

/** حالة الانتظار للنماذج التي تُرسل يدوياً (دون إعادة ضبط الحقول عند الخطأ) */
export const PendingCtx = createContext(false);
export function Submit({ children, pendingText, ...p }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending: fp } = useFormStatus(); const cp = useContext(PendingCtx); const pending = fp || cp;
  return <Button type="submit" disabled={pending || p.disabled} {...p}>{pending ? <><Loader2 className="size-4 animate-spin" />{pendingText ?? 'جارٍ الحفظ…'}</> : children}</Button>;
}
export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state?.error && !state?.ok) return null;
  return <div className={`rounded-xl px-4 py-3 text-sm font-medium ${state.error ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200' : 'bg-forest-100 text-forest-800 ring-1 ring-forest-300'}`}>{state.error ?? state.ok}</div>;
}

/** إرسال نموذج إلى إجراء خادم دون إعادة ضبط الحقول تلقائياً (تبقى مدخلات المستخدم عند الخطأ) */
export function useFormAction(action: (s: FormState, fd: FormData) => Promise<FormState>) {
  const [state, act, pending] = useActionState(action, {});
  const onSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null); startTransition(() => act(fd)); };
  return [state, onSubmit, pending] as const;
}
