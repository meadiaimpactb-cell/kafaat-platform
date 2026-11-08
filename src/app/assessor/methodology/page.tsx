import { MethodologyLibrary } from '@/components/methodology';
import { requireUser } from '@/lib/auth';
export const metadata = { title: 'مكتبة العوامل' };
export default async function Page() { await requireUser(['ASSESSOR', 'SUPER_ADMIN', 'ACCOUNT_MANAGER']); return <MethodologyLibrary />; }
