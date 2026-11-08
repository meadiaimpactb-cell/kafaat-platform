import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, payments } from '@/db';
import { verifyWithProvider } from '@/lib/payments';

// إشعارات تاب: نعيد التحقق من حالة العملية عبر الواجهة البرمجية بالمفتاح السري
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const chargeId: string | undefined = body?.id; const paymentId: string | undefined = body?.metadata?.payment_id;
  const pay = paymentId ? (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0]
    : chargeId ? (await db.select().from(payments).where(eq(payments.providerRef, chargeId)).limit(1))[0] : undefined;
  if (pay) await verifyWithProvider(pay.id, { id: chargeId });
  return NextResponse.json({ ok: true });
}
