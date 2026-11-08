import { MethodologyLibrary } from '@/components/methodology';
import { requireStaff } from '@/lib/auth';
export const metadata = { title: 'المنهجية' };
export default async function Page() { await requireStaff(); return <MethodologyLibrary />; }
