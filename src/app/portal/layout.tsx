import { and, eq, inArray } from 'drizzle-orm';
import { requireUser } from '@/lib/auth';
import { AppShell } from '@/components/shell';
import { db, assessments, infoRequests } from '@/db';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const u = await requireUser(['ORG_USER']);
  const as = u.orgId ? await db.select({ id: assessments.id }).from(assessments).where(eq(assessments.orgId, u.orgId)) : [];
  const open = as.length ? (await db.select({ id: infoRequests.id }).from(infoRequests).where(and(inArray(infoRequests.assessmentId, as.map(a => a.id)), eq(infoRequests.status, 'OPEN')))).length : 0;
  return (
    <AppShell user={u} homeHref="/portal" notifHref="/portal/notifications" tone="dark" nav={[
      { href: '/portal', label: 'رحلة التقييم', icon: 'Home', exact: true },
      { href: '/portal/assessments', label: 'طلبات التقييم', icon: 'ClipboardList', badge: open },
      { href: '/portal/certificates', label: 'الشهادات', icon: 'Award' },
      { href: '/portal/payments', label: 'المدفوعات والفواتير', icon: 'Receipt' },
      { href: '/portal/onboarding', label: 'بيانات الجهة', icon: 'Building2' },
      { href: '/portal/notifications', label: 'الإشعارات', icon: 'Bell' },
    ]}>{children}</AppShell>
  );
}
