import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { requireStaff } from '@/lib/auth';
import { db, assessments, organizations } from '@/db';
import { loadThread } from '@/lib/messages';
import { PageHeader, ButtonLink } from '@/components/ui';
import { MessageThread } from '@/components/messages/thread';
import { Composer } from '@/components/messages/composer';

export const metadata = { title: 'محادثة الطلب' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; await requireStaff('assessments.view');
  const a = (await db.select().from(assessments).where(eq(assessments.id, id)).limit(1))[0]; if (!a) notFound();
  const org = (await db.select().from(organizations).where(eq(organizations.id, a.orgId)).limit(1))[0];
  const items = await loadThread(id, 'STAFF');
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader eyebrow={<span className="ltr">{a.number}</span>} title={`محادثة ${org.name}`} subtitle="ردك هنا يصل الجهة باسم «فريق كفاءة الأثر»." actions={<ButtonLink href={`/admin/assessments/${id}`} variant="outline">فتح الطلب</ButtonLink>} />
      <MessageThread items={items} empty="لا رسائل بعد." />
      <Composer assessmentId={id} as="STAFF" viewer="STAFF" placeholder="اكتب ردك على الجهة…" />
    </div>
  );
}
