import { NotificationsList } from '@/components/notifications-list';
import { requireUser } from '@/lib/auth';
export const metadata = { title: 'الإشعارات' };
export default async function Page() { const u = await requireUser(['SUPER_ADMIN', 'ACCOUNT_MANAGER']); return <NotificationsList userId={u.id} />; }
