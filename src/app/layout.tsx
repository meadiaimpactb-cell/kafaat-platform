import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'منصة كفاءة الأثر', template: '%s · كفاءة الأثر' },
  description: 'منصة تقييم كفاءة الأثر للجهات غير الربحية: الأثر الصافي الموثق لكل ريال، وشهادة موثقة بزيارة تحقق.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
