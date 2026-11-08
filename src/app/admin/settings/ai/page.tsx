import { Bot, ShieldCheck } from 'lucide-react';
import { requireStaff } from '@/lib/auth';
import { aiConfig } from '@/lib/ai';
import { mask, decrypt } from '@/lib/crypto';
import { getSetting } from '@/lib/settings';
import { PageHeader, Card, CardTitle, Badge } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveAi, testAi } from '@/app/actions/admin';

export const metadata = { title: 'Claude والذكاء الاصطناعي' };
const MODELS = [['claude-sonnet-5-5', 'Claude Sonnet 5.5 — متوازن (موصى به)'], ['claude-opus-5-5', 'Claude Opus 5.5 — أعلى دقة للملفات المعقدة'], ['claude-haiku-5-5', 'Claude Haiku 5.5 — الأسرع والأقل كلفة']];
export default async function Page() {
  await requireStaff('settings.ai');
  const c = await aiConfig();
  const stored = await getSetting('ai');
  const fromEnv = !decrypt(stored.apiKey) && !!process.env.ANTHROPIC_API_KEY;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Claude والذكاء الاصطناعي" subtitle="يقرأ Claude ملفات الجهات (PDF وWord وExcel والصور)، ويستخرج الأرقام والأدلة، ويخبر الجهة بما ينقص، ويقترح للمقيّم مستوى مبدئياً لكل عامل مع المبرر. القرار النهائي للمقيّم دائماً." />
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <div className={`grid size-12 place-items-center rounded-2xl ${c.live ? 'bg-forest-950 text-lime-brand' : 'bg-amber-50 text-amber-700'}`}><Bot className="size-6" /></div>
        <div className="flex-1"><div className="font-semibold">{c.live ? 'Claude متصل ويعمل' : 'Claude غير مفعّل: تعمل المنصة بتحليل القواعد'}</div><div className="text-sm text-muted">{c.live ? `النموذج ${c.model}${fromEnv ? ' · المفتاح من متغيرات البيئة' : ''}` : 'أضف مفتاح API من Claude Console وفعّل الخيار.'}</div></div>
        {c.live ? <Badge tone="green" dot>متصل</Badge> : <Badge tone="amber">قواعد</Badge>}
      </Card>
      <Card className="p-6">
        <CardTitle title="الإعدادات" />
        <ActionForm action={saveAi} className="space-y-4">
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" name="enabled" defaultChecked={c.enabled} className="size-5 accent-forest-700" /> تفعيل التحليل بواسطة Claude</label>
          <label className="block"><span className="label">مفتاح Claude API</span><input name="apiKey" defaultValue={fromEnv ? '' : mask(c.apiKey)} className="input ltr font-mono text-sm" placeholder="sk-ant-api03-…" autoComplete="off" /><span className="mt-1 block text-xs text-muted">من console.anthropic.com ← API Keys. يُحفظ مشفراً، ولا يظهر كاملاً بعد الحفظ.</span></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="label">النموذج</span><select name="model" defaultValue={c.model} className="input">{MODELS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}{!MODELS.some(m => m[0] === c.model) && <option value={c.model}>{c.model}</option>}</select></label>
            <label><span className="label">أقصى حجم ملف للتحليل (م.ب)</span><input name="maxFileMb" type="number" defaultValue={c.maxFileMb} className="input num" /></label>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="autoAnalyze" defaultChecked={c.autoAnalyze} className="size-4 accent-forest-700" /> تحليل كل ملف تلقائياً فور رفعه</label>
          <Submit>حفظ</Submit>
        </ActionForm>
        <ActionForm action={testAi} className="mt-4 border-t border-line pt-4"><Submit variant="outline" size="sm" pendingText="جارٍ الاختبار…">اختبار الاتصال</Submit></ActionForm>
      </Card>
      <Card className="flex gap-3 p-5 text-sm leading-7 text-ink-2"><ShieldCheck className="mt-1 size-5 shrink-0 text-forest-700" /><div>الخصوصية: تُرسل محتويات الملفات إلى Claude عبر واجهة Anthropic البرمجية للتحليل فقط، ولا تُستخدم بيانات الواجهة البرمجية لتدريب النماذج افتراضياً. ننصح الجهات بعدم رفع بيانات شخصية للمستفيدين.</div></Card>
    </div>
  );
}
