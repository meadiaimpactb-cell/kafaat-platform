import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db, assessments, organizations } from '@/db';
import { loadThread, isAssignedExpert } from '@/lib/messages';
import { PageHeader, ButtonLink } from '@/components/ui';
import { MessageThread } from '@/components/messages/thread';
import { Composer } from '@/components/messages/composer';

export const metadata = { title: 'محادثة الجهة' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const a = (await db.select().from(assessments).where(eq(assessments.id, id)).limit(1))[0];
  if (!a || !isAssignedExpert(u, a)) notFound();
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const items = await loadThread(id, 'EXPERT');
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow={<span className="ltr">{a.number}</span>} title={`محادثة ${org.name}`} subtitle="تظهر رسائلك للجهة باسم «الخبير المراجع» دون اسمك أو بياناتك." actions={<ButtonLink href={`/assessor/assessments/${id}`} variant="outline">فتح مساحة التقييم</ButtonLink>} />
      <MessageThread items={items} empty="لا رسائل بعد." />
      <Composer assessmentId={id} as="EXPERT" viewer="STAFF" placeholder="اكتب ردك على استفسار الجهة…" />
    </div>
  );
}
