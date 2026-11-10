import Link from 'next/link';
import { MessageSquare } from 'lucide-react';
import { Badge, Empty } from '@/components/ui';
import { StatusBadge } from '@/components/journey';
import type { InboxRow } from '@/lib/messages';
import { fmtDate } from '@/lib/format';
import type { AssessmentStatus } from '@/db/schema';

export function Inbox({ rows, base, showOrg, emptyText }: { rows: InboxRow[]; base: string; showOrg?: boolean; emptyText: string }) {
  if (!rows.length) return <Empty icon={<MessageSquare className="size-6" />} title="لا توجد محادثات" text={emptyText} />;
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {rows.map(r => (
        <Link key={r.assessmentId} href={`${base}/${r.assessmentId}`} className="flex items-center gap-4 p-4 transition hover:bg-forest-50/60">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest-100 text-forest-800"><MessageSquare className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><span className="ltr font-mono text-xs font-semibold">{r.number}</span>{showOrg && <span className="font-semibold">{r.orgName}</span>}<StatusBadge status={r.status as AssessmentStatus} /></div>
            <div className="mt-1 truncate text-sm text-muted">{r.last ? r.last.body : 'لا رسائل بعد — ابدأ المحادثة'}</div>
          </div>
          <div className="text-left"><div className="text-xs text-muted">{r.last ? fmtDate(r.last.at, true) : ''}</div>{r.unread > 0 && <Badge tone="orange" className="mt-1">{r.unread} جديدة</Badge>}</div>
        </Link>
      ))}
    </div>
  );
}
