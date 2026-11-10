import { or, eq } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { db, assessments } from '@/db';
import { loadInbox } from '@/lib/messages';
import { PageHeader } from '@/components/ui';
import { Inbox } from '@/components/messages/inbox';

export const metadata = { title: 'رسائل الجهات' };
export default async function Page() {
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const as = await db.select({ id: assessments.id }).from(assessments).where(or(eq(assessments.assessorId, u.id), eq(assessments.secondAssessorId, u.id), eq(assessments.verifierId, u.id)));
  const rows = await loadInbox(as.map(a => a.id), ['ORG'], 'staffReadAt');
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="استفسارات الجهات" title="رسائل الجهات" subtitle="تظهر هنا المراسلات الواردة على الطلبات المسندة إليك. الجهة لا ترى اسمك ولا بياناتك في هذه المحادثة." />
      <Inbox rows={rows} base="/assessor/messages" showOrg emptyText="لا طلبات مسندة إليك بعد." />
    </div>
  );
}
