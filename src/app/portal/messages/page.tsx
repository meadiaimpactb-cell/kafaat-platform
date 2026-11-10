import { and, eq, ne } from 'drizzle-orm';
import { requireOrgUser } from '@/lib/auth';
import { db, assessments } from '@/db';
import { loadInbox } from '@/lib/messages';
import { PageHeader } from '@/components/ui';
import { Inbox } from '@/components/messages/inbox';

export const metadata = { title: 'المراسلة' };
export default async function Page() {
  const u = await requireOrgUser();
  const as = await db.select({ id: assessments.id }).from(assessments).where(and(eq(assessments.orgId, u.orgId), ne(assessments.status, 'CANCELLED')));
  const rows = await loadInbox(as.map(a => a.id), ['EXPERT', 'STAFF'], 'orgReadAt');
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="استفسارات التقييم" title="المراسلة" subtitle="راسل الخبير المراجع أو فريق كفاءة الأثر بشأن أي طلب. للمحافظة على استقلالية المراجعة لا تظهر هوية الخبير؛ تبقى المراسلة للاستفسار والإيضاح فقط." />
      <Inbox rows={rows} base="/portal/messages" emptyText="عند تقديم طلب تقييم تظهر هنا محادثته." />
    </div>
  );
}
