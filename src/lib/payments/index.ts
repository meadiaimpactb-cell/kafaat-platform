import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db, payments, paymentGateways, coupons, invoices, assessments, visits, organizations } from '@/db';
import { decrypt } from '../crypto';
import { getSetting, nextNumber } from '../settings';
import { notifyOrg, notifyStaff, logActivity } from '../notify';
import { PRODUCT_LABEL } from '../domain';

export type ProductCode = 'CERTIFICATE' | 'VERIFICATION_VISIT';
const round2 = (x: number) => Math.round(x * 100) / 100;

// ---------------------------------------------------------------- التسعير
export async function quote(product: ProductCode, couponCode?: string | null) {
  const p = await getSetting('pricing');
  const list = product === 'CERTIFICATE' ? p.certificate : p.visit;
  let discount = 0; let coupon: typeof coupons.$inferSelect | null = null; let couponError = '';
  if (couponCode) {
    const c = (await db.select().from(coupons).where(eq(coupons.code, couponCode.trim().toUpperCase())).limit(1))[0];
    if (!c || !c.active) couponError = 'الكود غير صحيح';
    else if (c.expiresAt && c.expiresAt < new Date()) couponError = 'انتهت صلاحية الكود';
    else if (c.maxUses != null && c.used >= c.maxUses) couponError = 'استُنفد استخدام الكود';
    else if (c.product !== 'ALL' && c.product !== product) couponError = 'الكود لا ينطبق على هذه الخدمة';
    else { coupon = c; discount = c.type === 'PERCENT' ? (list * Number(c.value)) / 100 : Math.min(list, Number(c.value)); }
  }
  discount = round2(discount);
  const rate = p.vatRate / 100; let subtotal: number; let vat: number; let total: number;
  if (p.pricesIncludeVat) { total = round2(list - discount); subtotal = round2(total / (1 + rate)); vat = round2(total - subtotal); }
  else { subtotal = round2(list - discount); vat = round2(subtotal * rate); total = round2(subtotal + vat); }
  return { product, label: PRODUCT_LABEL[product], listPrice: list, discount, subtotal, vat, total, vatRate: p.vatRate, includesVat: p.pricesIncludeVat, currency: p.currency, coupon, couponError };
}

export async function createPayment(orgId: string, assessmentId: string, product: ProductCode) {
  const existing = (await db.select().from(payments).where(and(eq(payments.assessmentId, assessmentId), eq(payments.product, product))))
    .find(x => ['PENDING', 'AWAITING_APPROVAL', 'PAID'].includes(x.status));
  if (existing) return existing;
  const q = await quote(product);
  const number = await nextNumber('PAY');
  await db.insert(payments).values({ number, orgId, assessmentId, product, listPrice: q.listPrice, discount: 0, subtotal: q.subtotal, vat: q.vat, total: q.total, currency: q.currency });
  return (await db.select().from(payments).where(eq(payments.number, number)).limit(1))[0];
}

/** إعادة التسعير عند إدخال كود خصم قبل الدفع */
export async function applyCoupon(paymentId: string, code: string | null) {
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!pay || pay.status !== 'PENDING') return { error: 'لا يمكن تعديل هذه الدفعة' };
  const q = await quote(pay.product, code);
  if (code && q.couponError) return { error: q.couponError };
  await db.update(payments).set({ couponId: q.coupon?.id ?? null, discount: q.discount, subtotal: q.subtotal, vat: q.vat, total: q.total }).where(eq(payments.id, paymentId));
  return { ok: true, total: q.total };
}

// ---------------------------------------------------------------- البوابات
export interface GatewayView { id: string; name: string; enabled: boolean; mode: string; config: Record<string, string> }
export const GATEWAY_FIELDS: Record<string, { key: string; label: string; secret?: boolean; help?: string }[]> = {
  sandbox: [],
  moyasar: [
    { key: 'publishableKey', label: 'المفتاح العام (Publishable Key)', help: 'يبدأ بـ pk_test_ أو pk_live_' },
    { key: 'secretKey', label: 'المفتاح السري (Secret Key)', secret: true, help: 'يبدأ بـ sk_test_ أو sk_live_' },
    { key: 'webhookSecret', label: 'رمز التحقق من الإشعارات (Webhook Secret)', secret: true },
  ],
  tap: [
    { key: 'publicKey', label: 'المفتاح العام (Public Key)' },
    { key: 'secretKey', label: 'المفتاح السري (Secret Key)', secret: true, help: 'يبدأ بـ sk_test_ أو sk_live_' },
    { key: 'merchantId', label: 'رقم التاجر (Merchant ID)' },
  ],
  bank_transfer: [],
};
export const GATEWAY_INFO: Record<string, { title: string; desc: string; methods: string }> = {
  sandbox: { title: 'بوابة تجريبية', desc: 'تحاكي الدفع الناجح والفاشل لاختبار المنصة دون مبالغ حقيقية. عطّلها قبل الإطلاق.', methods: 'بطاقة تجريبية' },
  moyasar: { title: 'ميسر', desc: 'بوابة سعودية: مدى، وفيزا، وماستركارد، وApple Pay، وSTC Pay. صفحة دفع مستضافة وتحقق تلقائي.', methods: 'مدى · Visa · Mastercard · Apple Pay · STC Pay' },
  tap: { title: 'تاب', desc: 'بوابة إقليمية تدعم مدى والبطاقات الائتمانية وApple Pay، بصفحة دفع مستضافة.', methods: 'مدى · Visa · Mastercard · Apple Pay' },
  bank_transfer: { title: 'تحويل بنكي', desc: 'يرفع العميل إيصال التحويل، وتعتمد الإدارة الدفعة يدوياً.', methods: 'تحويل إلى الحساب البنكي' },
};

export async function getGateways(onlyEnabled = false): Promise<GatewayView[]> {
  const rows = await db.select().from(paymentGateways).orderBy(paymentGateways.sortOrder);
  return rows.filter(r => !onlyEnabled || r.enabled).map(r => ({ id: r.id, name: r.name, enabled: r.enabled, mode: r.mode, config: Object.fromEntries(Object.entries(r.config ?? {}).map(([k, v]) => [k, decrypt(v)])) }));
}
async function gateway(id: string) { return (await getGateways()).find(g => g.id === id); }

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export type CheckoutResult = { type: 'redirect'; url: string } | { type: 'bank' } | { type: 'error'; message: string };

/** بدء الدفع عبر البوابة المختارة — تُقرأ المفاتيح من لوحة التحكم لحظياً */
export async function startCheckout(paymentId: string, gatewayId: string, customer: { name: string; email: string; phone?: string | null }): Promise<CheckoutResult> {
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!pay || pay.status === 'PAID') return { type: 'error', message: 'الدفعة غير متاحة' };
  const g = await gateway(gatewayId);
  if (!g || !g.enabled) return { type: 'error', message: 'البوابة غير مفعلة' };
  await db.update(payments).set({ gateway: gatewayId }).where(eq(payments.id, paymentId));
  const amountHalalas = Math.round(Number(pay.total) * 100);
  const desc = `${PRODUCT_LABEL[pay.product]} — ${pay.number}`;
  try {
    if (gatewayId === 'sandbox') return { type: 'redirect', url: `/pay/sandbox/${pay.id}` };
    if (gatewayId === 'bank_transfer') return { type: 'bank' };
    if (gatewayId === 'moyasar') {
      if (!g.config.secretKey) return { type: 'error', message: 'مفاتيح ميسر غير مكتملة في لوحة التحكم' };
      const res = await fetch('https://api.moyasar.com/v1/invoices', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(g.config.secretKey + ':').toString('base64') },
        body: JSON.stringify({ amount: amountHalalas, currency: pay.currency, description: desc, callback_url: `${appUrl()}/api/webhooks/moyasar`, success_url: `${appUrl()}/api/payments/return?gateway=moyasar&payment=${pay.id}`, back_url: `${appUrl()}/portal/checkout/${pay.id}`, metadata: { payment_id: pay.id, number: pay.number } }),
      });
      const j = await res.json();
      if (!res.ok || !j.url) return { type: 'error', message: 'تعذر إنشاء رابط الدفع من ميسر: ' + (j.message || res.status) };
      await db.update(payments).set({ providerRef: j.id, providerData: { invoice: j.id } }).where(eq(payments.id, pay.id));
      return { type: 'redirect', url: j.url };
    }
    if (gatewayId === 'tap') {
      if (!g.config.secretKey) return { type: 'error', message: 'مفاتيح تاب غير مكتملة في لوحة التحكم' };
      const [first, ...rest] = customer.name.split(' ');
      const res = await fetch('https://api.tap.company/v2/charges', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + g.config.secretKey },
        body: JSON.stringify({ amount: Number(pay.total), currency: pay.currency, threeDSecure: true, save_card: false, description: desc, reference: { transaction: pay.number, order: pay.number },
          customer: { first_name: first || 'عميل', last_name: rest.join(' ') || '-', email: customer.email }, source: { id: 'src_all' },
          post: { url: `${appUrl()}/api/webhooks/tap` }, redirect: { url: `${appUrl()}/api/payments/return?gateway=tap&payment=${pay.id}` }, metadata: { payment_id: pay.id } }),
      });
      const j = await res.json();
      const url = j?.transaction?.url;
      if (!res.ok || !url) return { type: 'error', message: 'تعذر إنشاء رابط الدفع من تاب: ' + (j?.errors?.[0]?.description || res.status) };
      await db.update(payments).set({ providerRef: j.id, providerData: { charge: j.id } }).where(eq(payments.id, pay.id));
      return { type: 'redirect', url };
    }
  } catch (e) {
    return { type: 'error', message: 'تعذر الاتصال ببوابة الدفع: ' + (e as Error).message };
  }
  return { type: 'error', message: 'بوابة غير معروفة' };
}

/** التحقق من حالة الدفع لدى البوابة (عند العودة أو عند وصول إشعار) */
export async function verifyWithProvider(paymentId: string, hint?: { id?: string | null }): Promise<'PAID' | 'FAILED' | 'PENDING'> {
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!pay) return 'FAILED';
  if (pay.status === 'PAID') return 'PAID';
  const g = pay.gateway ? await gateway(pay.gateway) : undefined;
  if (!g) return 'PENDING';
  try {
    if (g.id === 'moyasar' && pay.providerRef) {
      const res = await fetch(`https://api.moyasar.com/v1/invoices/${pay.providerRef}`, { headers: { Authorization: 'Basic ' + Buffer.from(g.config.secretKey + ':').toString('base64') } });
      const j = await res.json();
      if (j.status === 'paid' && Math.round(Number(pay.total) * 100) === j.amount) { await markPaid(pay.id, 'moyasar', j.id, { status: j.status, payments: j.payments?.map((p: { id: string }) => p.id) }); return 'PAID'; }
      if (['failed', 'canceled', 'expired'].includes(j.status)) { await db.update(payments).set({ status: 'FAILED', providerData: { status: j.status } }).where(eq(payments.id, pay.id)); return 'FAILED'; }
    }
    if (g.id === 'tap') {
      const chargeId = hint?.id || pay.providerRef;
      if (!chargeId) return 'PENDING';
      const res = await fetch(`https://api.tap.company/v2/charges/${chargeId}`, { headers: { Authorization: 'Bearer ' + g.config.secretKey } });
      const j = await res.json();
      if (j.status === 'CAPTURED' && Number(j.amount) === Number(pay.total)) { await markPaid(pay.id, 'tap', j.id, { status: j.status }); return 'PAID'; }
      if (['FAILED', 'DECLINED', 'CANCELLED', 'ABANDONED', 'VOID', 'TIMEDOUT'].includes(j.status)) { await db.update(payments).set({ status: 'FAILED', providerData: { status: j.status } }).where(eq(payments.id, pay.id)); return 'FAILED'; }
    }
  } catch (e) { console.error('verify failed', e); }
  return 'PENDING';
}

// ---------------------------------------------------------------- التسوية: تنعكس آلياً على الطلب
export async function markPaid(paymentId: string, gatewayId: string, ref?: string | null, data?: Record<string, unknown>, byUserId?: string) {
  const pay = (await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1))[0];
  if (!pay || pay.status === 'PAID') return pay;
  await db.update(payments).set({ status: 'PAID', paidAt: new Date(), gateway: gatewayId, providerRef: ref ?? pay.providerRef, providerData: { ...(pay.providerData ?? {}), ...(data ?? {}) } }).where(eq(payments.id, paymentId));
  if (pay.couponId) await db.update(coupons).set({ used: sql`${coupons.used} + 1` }).where(eq(coupons.id, pay.couponId));
  // الفاتورة
  const seller = await getSetting('seller'); const pricing = await getSetting('pricing');
  const org = (await db.select().from(organizations).where(eq(organizations.id, pay.orgId)).limit(1))[0];
  const invNo = await nextNumber('INV');
  await db.insert(invoices).values({ number: invNo, paymentId, data: {
    seller, buyer: { name: org?.name, licenseNo: org?.licenseNo, city: org?.city, email: org?.email },
    items: [{ description: PRODUCT_LABEL[pay.product], qty: 1, listPrice: pay.listPrice, discount: pay.discount, subtotal: pay.subtotal, vat: pay.vat, total: pay.total }],
    vatRate: pricing.vatRate, includesVat: pricing.pricesIncludeVat, currency: pay.currency, paymentNumber: pay.number, gateway: gatewayId } });
  // الأثر على مسار الطلب
  if (pay.assessmentId) {
    if (pay.product === 'CERTIFICATE') {
      await db.update(assessments).set({ status: 'DATA_COLLECTION' }).where(and(eq(assessments.id, pay.assessmentId), sql`${assessments.status} in ('DRAFT','AWAITING_PAYMENT')`));
      await notifyOrg(pay.orgId, 'تم استلام الدفعة: ابدأ تعبئة بيانات التقييم', `دفعتكم رقم ${pay.number} مكتملة. يمكنكم الآن الإجابة عن الأسئلة ورفع الملفات.`, `/portal/assessments/${pay.assessmentId}`);
    } else {
      await db.update(visits).set({ status: 'PAID' }).where(eq(visits.assessmentId, pay.assessmentId));
      await db.update(assessments).set({ status: 'VERIFICATION' }).where(eq(assessments.id, pay.assessmentId));
      await notifyOrg(pay.orgId, 'تم استلام رسوم زيارة التحقق', 'سيتواصل معكم مدير الحساب لتحديد موعد الزيارة.', `/portal/assessments/${pay.assessmentId}`);
    }
    await logActivity('payment.paid', { assessmentId: pay.assessmentId, userId: byUserId, details: { number: pay.number, total: pay.total, gateway: gatewayId } });
  }
  await notifyStaff('دفعة جديدة مكتملة', `${org?.name ?? ''} — ${PRODUCT_LABEL[pay.product]} — ${pay.total} ر.س`, '/admin/payments');
  return pay;
}
