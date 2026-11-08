import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { OnboardingForm } from './form';

export const metadata = { title: 'بيانات الجهة' };
export default async function Page() {
  const u = await requireUser(['ORG_USER']);
  const o = u.org!;
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={o.profileCompleted ? 'بيانات الجهة' : 'الخطوة 1 من 7'} title={o.profileCompleted ? 'بيانات الجهة' : 'لنتعرف على جهتك'} subtitle="هذه البيانات تحدد مسارك الحجمي ومتطلبات التقييم، وتظهر في الشهادة. يمكنك تعديلها لاحقاً قبل إرسال الطلب." />
      <OnboardingForm org={JSON.parse(JSON.stringify(o))} first={!o.profileCompleted} />
    </div>
  );
}
