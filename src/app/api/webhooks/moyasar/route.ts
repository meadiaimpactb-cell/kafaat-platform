import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, payments } from '@/db';
import { getGateways, verifyWithProvider } from '@/lib/payments';

// إشعارات ميسر: نتحقق من الرمز السري ثم نعيد التحقق من الحالة عبر الواجهة البرمجية (لا نثق بمحتوى الإشعار وحده)
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const g = (await getGateways()).find(x => x.id === 'moyasar');
  if (g?.config.webhookSecret && body.secret_token !== g.config.webhookSecret) return NextResponse.json({ error: 'invalid token' }, { status: 401 });
  const invoiceId = body?.data?.invoice_id ?? body?.data?.id; const paymentId = body?.data?.metadata?.payment_id;
  const pay = paymentId ? (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0]
    : invoiceId ? (await db.select().from(payments).where(eq(payments.providerRef, invoiceId)).limit(1))[0] : undefined;
  if (pay) await verifyWithProvider(pay.id);
  return NextResponse.json({ ok: true });
}
