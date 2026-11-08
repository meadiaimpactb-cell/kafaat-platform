'use client';
import { startTransition, useActionState, useEffect, useRef, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FormMessage, PendingCtx } from '@/components/client/submit';
import { Button } from '@/components/ui';
import type { FormState } from '@/app/actions/auth';
import type { ComponentProps } from 'react';

/** نموذج عام يعرض رسالة النجاح أو الخطأ من إجراء الخادم */
export function ActionForm({ action, children, className, resetOnOk, onOk }: { action: (s: FormState, fd: FormData) => Promise<FormState>; children: ReactNode; className?: string; resetOnOk?: boolean; onOk?: () => void }) {
  const [state, act, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { if (resetOnOk) ref.current?.reset(); onOk?.(); } }, [state, resetOnOk, onOk]);
  // إرسال يدوي حتى لا تُمسح مدخلات المستخدم عند ظهور خطأ تحقق
  return (
    <PendingCtx.Provider value={pending}>
      <form ref={ref} className={className} onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null); startTransition(() => act(fd)); }}>
        {children}<div className="mt-3 empty:hidden"><FormMessage state={state} /></div>
      </form>
    </PendingCtx.Provider>
  );
}

/** زر ينفذ إجراء خادم بلا نموذج */
export function ActionButton({ action, children, confirm: msg, ...p }: { action: () => Promise<unknown>; children: ReactNode; confirm?: string } & Omit<ComponentProps<typeof Button>, 'onClick' | 'action'>) {
  const [pending, start] = useTransition(); const router = useRouter();
  return <Button {...p} disabled={pending || p.disabled} onClick={() => { if (msg && !window.confirm(msg)) return; start(async () => { try { await action(); } catch (e) { window.alert((e as Error).message); } router.refresh(); }); }}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}{children}</Button>;
}
