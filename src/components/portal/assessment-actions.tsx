'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { submitAssessment } from '@/app/actions/org';
import { Button } from '@/components/ui';

export function SubmitAssessmentButton({ id, ready, resubmit }: { id: string; ready: boolean; resubmit?: boolean }) {
  const [pending, start] = useTransition(); const [err, setErr] = useState(''); const router = useRouter();
  return (
    <div className="space-y-2">
      <Button size="lg" variant={ready ? 'lime' : 'outline'} className="w-full" disabled={pending} onClick={() => start(async () => {
        setErr(''); const r = await submitAssessment(id);
        if (r && 'error' in r && r.error) setErr(r.error); else router.refresh();
      })}>{pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}{resubmit ? 'إعادة الإرسال للخبير' : 'إرسال الملف للمراجعة'}</Button>
      {err && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 ring-1 ring-rose-200">{err}</div>}
    </div>
  );
}
