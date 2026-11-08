import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, payments } from '@/db';
import { verifyWithProvider } from '@/lib/payments';

// العودة من صفحة الدفع المستضافة (ميسر/تاب): نتحقق من الحالة لدى البوابة ثم نعيد العميل
export async function GET(req: Request) {
  const u = new URL(req.url); const paymentId = u.searchParams.get('payment') ?? '';
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  const base = (process.env.APP_URL || u.origin).replace(/\/$/, '');
  if (!pay) return NextResponse.redirect(`${base}/portal/payments`);
  const status = await verifyWithProvider(pay.id, { id: u.searchParams.get('tap_id') ?? u.searchParams.get('id') });
  if (status === 'PAID') return NextResponse.redirect(`${base}/portal/assessments/${pay.assessmentId}${pay.product === 'CERTIFICATE' ? '' : '/verification'}?paid=1`);
  return NextResponse.redirect(`${base}/portal/checkout/${pay.id}?${status === 'FAILED' ? 'failed=1' : 'pending=1'}`);
}
