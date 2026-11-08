import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Bell, CheckCheck } from 'lucide-react';
import { db, notifications } from '@/db';
import { markAllRead } from '@/app/actions/org';
import { PageHeader, Card, Empty, Button } from './ui';
import { fmtRel } from '@/lib/format';
import { cn } from '@/lib/cn';

export async function NotificationsList({ userId }: { userId: string }) {
  const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(100);
  const unread = rows.filter(r => !r.readAt).length;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="الإشعارات" subtitle={unread ? `${unread} غير مقروءة` : 'كل الإشعارات مقروءة'} actions={unread ? <form action={markAllRead}><Button variant="outline" size="sm"><CheckCheck className="size-4" /> تعليم الكل كمقروء</Button></form> : null} />
      {rows.length ? (
        <Card className="divide-y divide-line">
          {rows.map(n => (
            <Link key={n.id} href={n.link ?? '#'} className={cn('flex gap-4 p-5 transition hover:bg-forest-50/50', !n.readAt && 'bg-lime-100/30')}>
              <div className={cn('grid size-10 shrink-0 place-items-center rounded-xl', n.readAt ? 'bg-forest-50 text-forest-600' : 'bg-forest-800 text-lime-brand')}><Bell className="size-4" /></div>
              <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="font-semibold">{n.title}</span><span className="shrink-0 text-xs text-muted">{fmtRel(n.createdAt)}</span></div>{n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}</div>
            </Link>
          ))}
        </Card>
      ) : <Empty icon={<Bell className="size-6" />} title="لا إشعارات" />}
    </div>
  );
}
