import type { ReactNode } from 'react';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { db, assessments, payments, visits } from '@/db';
import { requireUser, can } from '@/lib/auth';
import { AppShell } from '@/components/shell';
import type { NavItem } from '@/components/client/nav-links';
import type { Permission } from '@/lib/permissions';

export default async function Layout({ children }: { children: ReactNode }) {
  const u = await requireUser(['SUPER_ADMIN', 'ACCOUNT_MANAGER']);
  const [unassigned, awaiting, toSchedule] = await Promise.all([
    db.select({ c: count() }).from(assessments).where(and(eq(assessments.status, 'SUBMITTED'), isNull(assessments.assessorId))),
    db.select({ c: count() }).from(payments).where(eq(payments.status, 'AWAITING_APPROVAL')),
    db.select({ c: count() }).from(visits).where(inArray(visits.status, ['PAID', 'COMPLETED'])),
  ]);
  const items: (NavItem & { perm?: Permission })[] = [
    { href: '/admin', label: 'نظرة عامة', icon: 'LayoutDashboard', exact: true },
    { href: '/admin/assessments', label: 'طلبات التقييم', icon: 'ClipboardList', perm: 'assessments.view', badge: unassigned[0].c, section: 'العمليات' },
    { href: '/admin/organizations', label: 'الجهات', icon: 'Building2', perm: 'orgs.view', section: 'العمليات' },
    { href: '/admin/visits', label: 'زيارات التحقق', icon: 'MapPin', perm: 'visits.manage', badge: toSchedule[0].c, section: 'العمليات' },
    { href: '/admin/certificates', label: 'الشهادات', icon: 'Award', perm: 'certificates.issue', section: 'العمليات' },
    { href: '/admin/payments', label: 'المدفوعات والفواتير', icon: 'Wallet', perm: 'payments.view', badge: awaiting[0].c, section: 'المالية' },
    { href: '/admin/coupons', label: 'أكواد الخصم', icon: 'TicketPercent', perm: 'coupons.manage', section: 'المالية' },
    { href: '/admin/settings/gateways', label: 'بوابات الدفع', icon: 'CreditCard', perm: 'settings.gateways', section: 'المالية' },
    { href: '/admin/users', label: 'الفريق والصلاحيات', icon: 'Users', perm: 'users.manage', section: 'الإعدادات' },
    { href: '/admin/settings/pricing', label: 'الأسعار والفوترة', icon: 'Receipt', perm: 'settings.pricing', section: 'الإعدادات' },
    { href: '/admin/settings/ai', label: 'Claude والذكاء الاصطناعي', icon: 'Bot', perm: 'settings.ai', section: 'الإعدادات' },
    { href: '/admin/settings/requirements', label: 'متطلبات الملفات', icon: 'FileCog', perm: 'settings.requirements', section: 'الإعدادات' },
    { href: '/admin/methodology', label: 'المنهجية والعوامل', icon: 'Library', section: 'الإعدادات' },
    { href: '/admin/audit', label: 'سجل النشاط', icon: 'ScrollText', perm: 'audit.view', section: 'الإعدادات' },
    { href: '/assessor', label: 'مساحة المقيّم', icon: 'ListChecks', section: 'التنقل' },
  ];
  const nav = items.filter(i => !i.perm || can(u, i.perm)).map(({ perm: _p, ...i }) => i);
  return <AppShell user={u} nav={nav} homeHref="/admin" notifHref="/admin/notifications" tone="dark">{children}</AppShell>;
}
