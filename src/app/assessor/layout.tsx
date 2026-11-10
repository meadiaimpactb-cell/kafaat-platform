import type { ReactNode } from 'react';
import { and, count, eq, inArray, or } from 'drizzle-orm';
import { db, assessments, visits } from '@/db';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/shell';
import { expertUnread } from '@/lib/messages';

export default async function Layout({ children }: { children: ReactNode }) {
  const u = await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const pending = (await db.select({ c: count() }).from(assessments).where(and(or(eq(assessments.assessorId, u.id), eq(assessments.secondAssessorId, u.id)), inArray(assessments.status, ['SUBMITTED', 'UNDER_REVIEW']))))[0].c;
  const vis = (await db.select({ c: count() }).from(visits).where(and(eq(visits.consultantId, u.id), inArray(visits.status, ['PAID', 'SCHEDULED']))))[0].c;
  const unreadMsgs = await expertUnread(u.id);
  return (
    <AppShell user={u} homeHref="/assessor" notifHref="/assessor/notifications" tone="light" nav={[
      { href: '/assessor', label: 'لوحتي', icon: 'Gauge', exact: true },
      { href: '/assessor/assessments', label: 'طلبات التقييم', icon: 'ClipboardList', badge: pending },
      { href: '/assessor/visits', label: 'زيارات التحقق', icon: 'MapPin', badge: vis },
      { href: '/assessor/messages', label: 'رسائل الجهات', icon: 'MessageSquare', badge: unreadMsgs },
      { href: '/assessor/methodology', label: 'مكتبة المعايير', icon: 'Library' },
      { href: '/assessor/notifications', label: 'الإشعارات', icon: 'Bell' },
      ...(u.role !== 'ASSESSOR' ? [{ href: '/admin', label: 'لوحة التحكم', icon: 'LayoutDashboard', section: 'التنقل' }] : []),
    ]}>{children}</AppShell>
  );
}
