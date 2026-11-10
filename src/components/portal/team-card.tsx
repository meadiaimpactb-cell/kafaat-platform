import Link from 'next/link';
import { eq, inArray } from 'drizzle-orm';
import { Mail, MessageSquare, Phone, ShieldCheck, UserCheck } from 'lucide-react';
import { db, users } from '@/db';
import { Card, CardTitle } from '@/components/ui';
import type { assessments } from '@/db';

type A = typeof assessments.$inferSelect;
/**
 * فريق التقييم كما تراه الجهة. يحكم الظهور علمان لكل مرحلة:
 *  - المرحلة المكتبية (التقرير غير الموثق): تُحجب بيانات الخبير افتراضياً (revealAssessor) حفاظاً على الاستقلالية.
 *  - مرحلة التحقق (التقرير الموثق): تظهر بيانات خبير التحقق افتراضياً (revealVerifier) لضرورة التنسيق الميداني.
 * وفي الحالتين تبقى المراسلة متاحة دون كشف هوية.
 */
export async function TeamCard({ a, stage = 'ALL' }: { a: A; stage?: 'DESK' | 'VERIFY' | 'ALL' }) {
  const ids = [a.assessorId, a.secondAssessorId, a.verifierId].filter(Boolean) as string[];
  const rows = ids.length ? await db.select({ id: users.id, name: users.name, email: users.email, phone: users.phone, specialties: users.specialties }).from(users).where(inArray(users.id, ids)) : [];
  const by = Object.fromEntries(rows.map(r => [r.id, r]));
  const blocks: { key: string; title: string; people: (typeof rows)[number][]; reveal: boolean }[] = [];
  if (stage !== 'VERIFY' && a.assessorId) blocks.push({ key: 'desk', title: 'المراجعة المكتبية — التقرير غير الموثق', people: [by[a.assessorId], a.secondAssessorId ? by[a.secondAssessorId] : null].filter(Boolean) as never, reveal: a.revealAssessor });
  if (stage !== 'DESK' && a.verifierId) blocks.push({ key: 'verify', title: 'التحقق الميداني — التقرير الموثق', people: [by[a.verifierId]].filter(Boolean) as never, reveal: a.revealVerifier });
  if (!blocks.length) return null;
  return (
    <Card className="p-6">
      <CardTitle icon={<UserCheck className="size-5" />} title="فريق التقييم" subtitle="الخبراء المعيّنون لطلبكم" />
      <div className="mt-4 space-y-4">
        {blocks.map(b => (
          <div key={b.key} className="rounded-2xl bg-forest-50 p-4">
            <div className="mb-2 text-xs font-semibold text-forest-700">{b.title}</div>
            {b.reveal ? (
              <ul className="space-y-3">{b.people.map(p => (
                <li key={p.id} className="text-sm">
                  <div className="font-semibold">{p.name}</div>
                  {p.specialties && <div className="text-xs text-muted">{p.specialties}</div>}
                  <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                    {p.phone && <a href={`tel:${p.phone}`} className="ltr flex items-center gap-1.5 text-forest-800 hover:underline"><Phone className="size-3.5" /> {p.phone}</a>}
                    <a href={`mailto:${p.email}`} className="ltr flex items-center gap-1.5 text-forest-800 hover:underline"><Mail className="size-3.5" /> {p.email}</a>
                  </div>
                </li>))}</ul>
            ) : (
              <div className="flex items-start gap-2 text-sm"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-forest-700" /><span>خبير مراجع معتمد{b.people.length > 1 ? 'ان' : ''} — تُحجب الهوية حفاظاً على استقلالية التقييم.</span></div>
            )}
          </div>
        ))}
      </div>
      <Link href={`/portal/messages/${a.id}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-semibold text-forest-800 hover:border-forest-500"><MessageSquare className="size-4" /> مراسلة الخبير للاستفسار</Link>
    </Card>
  );
}
