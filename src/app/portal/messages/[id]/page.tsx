import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { ShieldCheck } from 'lucide-react';
import { requireUser, ownsOrg } from '@/lib/auth';
import { db, assessments } from '@/db';
import { loadThread } from '@/lib/messages';
import { PageHeader, ButtonLink } from '@/components/ui';
import { MessageThread } from '@/components/messages/thread';
import { Composer } from '@/components/messages/composer';

export const metadata = { title: 'محادثة الطلب' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(['ORG_USER']);
  const a = (await db.select().from(assessments).where(eq(assessments.id, id)).limit(1))[0];
  if (!a || !ownsOrg(u, a.orgId) || a.status === 'CANCELLED') notFound();
  const items = await loadThread(id, 'ORG');
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow={<span className="ltr">{a.number}</span>} title="مراسلة الخبير المراجع" actions={<ButtonLink href={`/portal/assessments/${id}`} variant="outline">فتح الطلب</ButtonLink>} />
      <div className="flex items-start gap-3 rounded-2xl bg-forest-50 p-4 text-sm leading-7 text-forest-900"><ShieldCheck className="mt-1 size-5 shrink-0 text-forest-700" /> تصلك ردود «الخبير المراجع» دون كشف هويته حفاظاً على استقلالية التقييم. المراسلة للاستفسار والإيضاح فقط، ولا تغيّر نتيجة التقييم، وتُرفق الملفات من صفحة الطلب.</div>
      <MessageThread items={items} empty="لا رسائل بعد. اكتب استفسارك أدناه وسيصلك الرد هنا وعلى بريدك." />
      <Composer assessmentId={id} as="ORG" viewer="ORG" placeholder="اكتب استفسارك عن التقييم أو الملفات المطلوبة…" />
    </div>
  );
}
