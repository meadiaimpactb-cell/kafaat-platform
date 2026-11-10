import { desc } from 'drizzle-orm';
import { db, emailOutbox } from '@/db';
import { requireStaff } from '@/lib/auth';
import { PageHeader, Card, Badge, Empty } from '@/components/ui';
import { fmtDate } from '@/lib/format';

export const metadata = { title: 'البريد الصادر' };
const TONE = { SENT: 'green', QUEUED: 'amber', FAILED: 'rose' } as const;
const LABEL = { SENT: 'أُرسلت', QUEUED: 'مسجلة (لم يُضبط SMTP)', FAILED: 'فشل الإرسال' } as const;
export default async function Page() {
  await requireStaff('audit.view');
  const rows = await db.select().from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(60);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="البريد الصادر" subtitle="كل رسائل المنصة (استعادة كلمة المرور والإشعارات). عند عدم ضبط SMTP تُسجَّل هنا دون إرسال؛ اضبط SMTP_HOST وSMTP_USER وSMTP_PASS لتفعيل الإرسال الفعلي." />
      {rows.length ? <div className="space-y-2">{rows.map(r => (
        <Card key={r.id} className="p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm"><Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge><span className="font-semibold">{r.subject}</span><span className="ltr text-xs text-muted">{r.toEmail}</span><span className="ms-auto text-xs text-muted">{fmtDate(r.createdAt, true)}</span></div>
          {r.error && <div className="mt-2 text-xs text-rose-600">{r.error}</div>}
        </Card>
      ))}</div> : <Empty title="لا رسائل" />}
    </div>
  );
}
