import { requireStaff } from '@/lib/auth';
import { db, messages } from '@/db';
import { loadInbox } from '@/lib/messages';
import { PageHeader } from '@/components/ui';
import { Inbox } from '@/components/messages/inbox';

export const metadata = { title: 'مراسلات الجهات' };
export default async function Page() {
  await requireStaff('assessments.view');
  const ids = (await db.selectDistinct({ id: messages.assessmentId }).from(messages)).map(r => r.id);
  const rows = await loadInbox(ids, ['ORG'], 'staffReadAt');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="المراسلة" title="مراسلات الجهات والخبراء" subtitle="تشاهد المحادثات كاملة بأسماء الخبراء الحقيقية، بينما تراها الجهة باسم «الخبير المراجع» دون أي بيانات تعريفية." />
      <Inbox rows={rows} base="/admin/messages" showOrg emptyText="لم تبدأ أي جهة مراسلة بعد." />
    </div>
  );
}
