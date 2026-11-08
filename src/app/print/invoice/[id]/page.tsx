import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import QRCode from 'qrcode';
import { db, invoices, payments } from '@/db';
import { requireOwnerOrStaff } from '@/lib/print-access';
import { PrintBar } from '@/components/client/print-bar';
import { fmtDate, fmtNum } from '@/lib/format';

export const metadata = { title: 'فاتورة ضريبية' };
/** رمز QR بصيغة TLV المعتمدة للفواتير الضريبية المبسطة في المملكة */
function tlv(fields: string[]) {
  const parts = fields.map((v, i) => { const b = Buffer.from(v, 'utf8'); return Buffer.concat([Buffer.from([i + 1, b.length]), b]); });
  return Buffer.concat(parts).toString('base64');
}
type Inv = { seller: { name: string; vatNumber: string; crNumber: string; address: string; email: string; phone: string }; buyer: { name?: string; licenseNo?: string; city?: string; email?: string }; items: { description: string; qty: number; listPrice: number; discount: number; subtotal: number; vat: number; total: number }[]; vatRate: number; includesVat: boolean; currency: string; paymentNumber: string; gateway: string };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inv = (await db.select().from(invoices).where(eq(invoices.id, id)).limit(1))[0]; if (!inv) notFound();
  const pay = (await db.select().from(payments).where(eq(payments.id, inv.paymentId)).limit(1))[0];
  const u = await requireOwnerOrStaff(pay.orgId, 'payments.view');
  const d = inv.data as unknown as Inv;
  const it = d.items[0];
  const qr = await QRCode.toDataURL(tlv([d.seller.name, d.seller.vatNumber || '000000000000000', inv.issuedAt.toISOString(), Number(it.total).toFixed(2), Number(it.vat).toFixed(2)]), { margin: 0, width: 180 });
  const m = (v: number) => fmtNum(Number(v), 2);
  return (
    <>
      <PrintBar back={u.role === 'ORG_USER' ? '/portal/payments' : '/admin/payments'} title={`فاتورة ${inv.number}`} />
      <style>{`@page { size: A4; margin: 0 }`}</style>
      <div className="flex justify-center p-6 print:p-0">
        <div className="relative min-h-[297mm] w-[210mm] bg-white px-[16mm] py-[14mm] text-[10pt] shadow-2xl print:shadow-none" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
          <div className="absolute inset-x-0 top-0 h-[2.5mm] spectrum" />
          <div className="flex items-start justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="" className="h-[15mm] w-auto" />
            <div className="text-left"><div className="font-display text-[20pt] font-black text-forest-950">فاتورة ضريبية مبسطة</div><div className="ltr text-[9pt] text-muted">Simplified Tax Invoice</div></div>
          </div>
          <div className="mt-[8mm] grid grid-cols-3 gap-[4mm] rounded-[3mm] bg-forest-50 p-[4mm]">
            <div><div className="text-[8pt] text-muted">رقم الفاتورة</div><div className="ltr text-right font-mono font-bold">{inv.number}</div></div>
            <div><div className="text-[8pt] text-muted">تاريخ الإصدار</div><div className="font-bold">{fmtDate(inv.issuedAt, true)}</div></div>
            <div><div className="text-[8pt] text-muted">مرجع الدفع</div><div className="ltr text-right font-mono font-bold">{d.paymentNumber}</div></div>
          </div>
          <div className="mt-[6mm] grid grid-cols-2 gap-[6mm]">
            <div><div className="mb-[1.5mm] text-[8.5pt] font-bold text-forest-700">البائع</div><div className="font-bold">{d.seller.name}</div><div>الرقم الضريبي: <span className="ltr">{d.seller.vatNumber || '—'}</span></div><div>السجل: <span className="ltr">{d.seller.crNumber || '—'}</span></div><div>{d.seller.address}</div><div className="ltr text-right">{d.seller.email} {d.seller.phone}</div></div>
            <div><div className="mb-[1.5mm] text-[8.5pt] font-bold text-forest-700">المشتري</div><div className="font-bold">{d.buyer.name}</div><div>رقم الترخيص: <span className="ltr">{d.buyer.licenseNo ?? '—'}</span></div><div>{d.buyer.city}</div><div className="ltr text-right">{d.buyer.email}</div></div>
          </div>
          <table className="mt-[8mm] w-full border-collapse text-[9.5pt]">
            <thead><tr className="bg-forest-950 text-white">{['الوصف', 'الكمية', 'السعر', 'الخصم', 'الخاضع للضريبة', `الضريبة ${d.vatRate}٪`, 'الإجمالي'].map(h => <th key={h} className="px-[2.5mm] py-[2.5mm] text-right font-semibold">{h}</th>)}</tr></thead>
            <tbody>{d.items.map((x, i) => <tr key={i} className="border-b border-line"><td className="px-[2.5mm] py-[3mm]">{x.description}</td><td className="px-[2.5mm] num">{x.qty}</td><td className="px-[2.5mm] num">{m(x.listPrice)}</td><td className="px-[2.5mm] num">{m(x.discount)}</td><td className="px-[2.5mm] num">{m(x.subtotal)}</td><td className="px-[2.5mm] num">{m(x.vat)}</td><td className="px-[2.5mm] num font-bold">{m(x.total)}</td></tr>)}</tbody>
          </table>
          <div className="mt-[6mm] flex items-start justify-between gap-[8mm]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR" className="size-[34mm]" />
            <div className="w-[80mm] space-y-[2mm]">
              <div className="flex justify-between"><span className="text-muted">الإجمالي قبل الضريبة</span><span className="num">{m(it.subtotal)} ر.س</span></div>
              <div className="flex justify-between"><span className="text-muted">ضريبة القيمة المضافة ({d.vatRate}٪)</span><span className="num">{m(it.vat)} ر.س</span></div>
              <div className="flex justify-between border-t-2 border-forest-950 pt-[2mm] font-display text-[14pt] font-black"><span>الإجمالي المستحق</span><span className="num">{m(it.total)} ر.س</span></div>
              <div className="rounded-[2mm] bg-forest-100 px-[3mm] py-[1.5mm] text-center text-[9pt] font-bold text-forest-800">مدفوعة · {fmtDate(pay.paidAt, true)}</div>
            </div>
          </div>
          <div className="absolute inset-x-[16mm] bottom-[12mm] border-t border-line pt-[3mm] text-[8pt] leading-[4.5mm] text-muted">صدرت هذه الفاتورة آلياً من منصة كفاءة الأثر عند اكتمال الدفع. أي استفسار: {d.seller.email}</div>
        </div>
      </div>
    </>
  );
}
