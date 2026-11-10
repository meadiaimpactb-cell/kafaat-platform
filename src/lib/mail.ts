import 'server-only';
import { db, emailOutbox } from '@/db';
import { eq } from 'drizzle-orm';

export const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** قالب موحد لرسائل المنصة (RTL) */
export function mailTemplate(title: string, body: string, cta?: { label: string; url: string }) {
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;background:#F5F6F0;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E3E8DE">
<div style="background:#0B5233;color:#fff;padding:18px 24px;font-size:18px;font-weight:bold">منصة كفاءة الأثر</div>
<div style="padding:24px;color:#1E2A23;line-height:1.9"><h2 style="margin:0 0 12px;font-size:18px">${esc(title)}</h2><div style="font-size:15px">${body}</div>
${cta ? `<p style="margin:24px 0 0"><a href="${esc(cta.url)}" style="background:#C4D42A;color:#06281A;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:10px;display:inline-block">${esc(cta.label)}</a></p>` : ''}
</div><div style="padding:14px 24px;background:#F5F6F0;color:#6B7A70;font-size:12px">إحدى مبادرات استديو صناع الأثر</div></div></div>`;
}

/** يحفظ الرسالة دائماً في سجل الصادر، ويرسلها عبر SMTP إن كان مضبوطاً (SMTP_HOST) */
export async function sendMail(to: string | string[], subject: string, html: string) {
  const toEmail = (Array.isArray(to) ? to : [to]).filter(Boolean).join(',');
  if (!toEmail) return { ok: false as const };
  const id = (await db.insert(emailOutbox).values({ toEmail, subject: subject.slice(0, 240), html, status: 'QUEUED' }).$returningId())[0].id;
  if (!process.env.SMTP_HOST) return { ok: true as const, queued: true, id };
  try {
    const nodemailer = await import('nodemailer');
    const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
    await t.sendMail({ from: process.env.SMTP_FROM || 'كفاءة الأثر <no-reply@localhost>', to: toEmail, subject, html });
    await db.update(emailOutbox).set({ status: 'SENT' }).where(eq(emailOutbox.id, id));
    return { ok: true as const, id };
  } catch (e) {
    await db.update(emailOutbox).set({ status: 'FAILED', error: String((e as Error).message).slice(0, 500) }).where(eq(emailOutbox.id, id));
    console.error('mail failed', e);
    return { ok: false as const, id };
  }
}
