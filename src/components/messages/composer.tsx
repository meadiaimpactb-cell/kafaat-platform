'use client';
import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { sendMessage, markThreadRead } from '@/app/actions/messages';
import { Submit, FormMessage } from '@/components/client/submit';

/** نموذج الرد + تحديث دوري للمحادثة + تعليمها مقروءة عند الفتح */
export function Composer({ assessmentId, as, viewer, placeholder }: { assessmentId: string; as: 'ORG' | 'EXPERT' | 'STAFF'; viewer: 'ORG' | 'STAFF'; placeholder?: string }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [s, action] = useActionState(sendMessage, undefined);
  useEffect(() => { markThreadRead(assessmentId, viewer).then(() => router.refresh()); }, [assessmentId, viewer, router]);
  useEffect(() => { const t = setInterval(() => router.refresh(), 20000); return () => clearInterval(t); }, [router]);
  useEffect(() => { if (s?.ok) ref.current?.reset(); }, [s]);
  return (
    <form ref={ref} action={action} className="space-y-3 rounded-2xl bg-white p-4 ring-1 ring-line">
      <input type="hidden" name="assessmentId" value={assessmentId} /><input type="hidden" name="as" value={as} />
      <FormMessage state={s} />
      <textarea name="body" required rows={3} maxLength={4000} defaultValue={s?.fields?.body} placeholder={placeholder ?? 'اكتب رسالتك…'} className="input" onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') ref.current?.requestSubmit(); }} />
      <div className="flex items-center justify-between"><span className="text-xs text-muted">Ctrl + Enter للإرسال</span><Submit pendingText="جارٍ الإرسال…"><Send className="size-4" /> إرسال</Submit></div>
    </form>
  );
}
