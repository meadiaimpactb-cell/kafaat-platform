import Link from 'next/link';
import { ArrowLeft, BadgeCheck, Bot, ClipboardCheck, CreditCard, FileSearch, FileUp, Gauge, Landmark, Layers, LineChart, MapPin, Scale, ShieldCheck, Sparkles, Target, Wallet } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/public-shell';
import { ButtonLink, EfficiencyLabel } from '@/components/ui';
import { getSetting } from '@/lib/settings';
import { fmtNum } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const p = await getSetting('pricing');
  const steps = [
    { icon: <Landmark className="size-5" />, t: 'أنشئ حساب الجهة', d: 'البيانات الرئيسة: الترخيص، والمجال، ومصروفات آخر سنة مالية لتحديد مسارك الحجمي.' },
    { icon: <CreditCard className="size-5" />, t: 'ادفع رسوم التقييم', d: `${fmtNum(p.certificate)} ريال عبر مدى أو البطاقات أو التحويل البنكي، وتبدأ التعبئة فوراً.` },
    { icon: <FileUp className="size-5" />, t: 'أجب وارفع ملفاتك', d: 'أسئلة واضحة لكل عامل، واسحب ملفاتك فيقرأها الذكاء الاصطناعي ويخبرك بما ينقص.' },
    { icon: <ClipboardCheck className="size-5" />, t: 'مراجعة المقيّم الخبير', d: 'يقدّر مقيّم معتمد كل عامل بالدليل وفق نماذج تقييم مكتوبة، ويطلب الاستيضاح عند الحاجة.' },
    { icon: <Gauge className="size-5" />, t: 'نتيجتك وتقرير الفجوات', d: 'درجة من 100 ومستوى، وفجوات مرتبة بالأولوية، وتوصيات بأثرها على الدرجة.' },
    { icon: <BadgeCheck className="size-5" />, t: 'الشهادة الموثقة', d: 'زيارة تحقق ميدانية من مستشار معتمد، ثم شهادة موثقة برمز تحقق عام.' },
  ];
  return (
    <>
      {/* ------------------------------------------------ Hero */}
      <section className="relative overflow-hidden bg-mesh text-white">
        <div className="absolute inset-0 bg-grid-dark opacity-70" />
        <PublicHeader dark />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pb-24 pt-36 lg:grid-cols-[1.15fr_1fr]">
          <div className="animate-rise">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-lime-brand backdrop-blur">
              <Sparkles className="size-4" /> تقييم مدعوم بالذكاء الاصطناعي ومراجعة خبراء معتمدين
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.25] md:text-[3.4rem]">
              كم من <span className="text-lime-brand">الأثر الحقيقي</span><br />يصنعه كل ريال في جهتك؟
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-9 text-white/75">
              شهادة كفاءة الأثر تقيس الأثر الصافي المحقق والموثق لكل وحدة مورد، بمنهج من 56 عاملاً ومعادلة شفافة، وتمنح جهتك مستوى يفهمه المانحون وخريطة واضحة للتطور.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/register" variant="lime" size="lg">ابدأ تقييم جهتك <ArrowLeft className="size-5" /></ButtonLink>
              <ButtonLink href="/verify" variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white border border-white/20">تحقق من شهادة</ButtonLink>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-4">
              {[['56', 'عاملاً معتمداً'], ['15', 'مؤشراً محتسباً'], ['+10', 'خبراء اعتمدوا الأوزان']].map(([n, l]) => (
                <div key={l} className="border-s-2 border-lime-brand/60 ps-4"><div className="font-display text-3xl font-bold num">{n}</div><div className="text-sm text-white/60">{l}</div></div>
              ))}
            </div>
          </div>
          {/* بطاقة الكفاءة */}
          <div className="relative animate-rise [animation-delay:.15s]">
            <div className="absolute -inset-6 rounded-[2rem] bg-lime-brand/10 blur-2xl" />
            <div className="relative rounded-[1.75rem] border border-white/15 bg-white p-7 text-ink shadow-2xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-forest-600">بطاقة كفاءة الأثر</div>
                  <div className="mt-1 font-display text-lg font-bold">جمعية النماء للتمكين الأسري</div>
                  <div className="text-xs text-muted">مثال توضيحي · المسار المتوسط · السنة المالية {new Date().getFullYear() - 1}</div>
                </div>
                <div className="rounded-xl bg-forest-100 px-3 py-1.5 text-xs font-bold text-forest-800">موثقة</div>
              </div>
              <div className="mt-6"><EfficiencyLabel level="متمكن" score={64.7} /></div>
              <div className="mt-6 grid grid-cols-4 gap-2 border-t border-line pt-5 text-center">
                {[['22.5', 'الموارد'], ['20.2', 'الأدلة'], ['14.5', 'الأثر'], ['7.5', 'المساءلة']].map(([v, l]) => (
                  <div key={l}><div className="font-display text-lg font-bold num text-forest-800">{v}</div><div className="text-[11px] text-muted">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="spectrum relative h-1.5" />
      </section>

      {/* ------------------------------------------------ Trust */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6 text-sm text-muted">
          <span className="flex items-center gap-2"><Layers className="size-4 text-forest-600" /> مبني على دراسة 132 عاملاً</span>
          <span className="flex items-center gap-2"><FileSearch className="size-4 text-forest-600" /> مراجعة أكثر من 30 إطاراً عالمياً</span>
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-forest-600" /> أوزان اعتمدتها ورش خبراء</span>
          <span className="flex items-center gap-2"><Scale className="size-4 text-forest-600" /> معادلة معلنة قابلة للتتبع</span>
        </div>
      </section>

      {/* ------------------------------------------------ How */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold text-forest-600">رحلة التقييم</div>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">ست خطوات واضحة من التسجيل إلى الشهادة</h2>
          <p className="mt-4 text-muted leading-8">تعرف في كل لحظة أين وصلت وما الخطوة التالية. والمنصة تقرأ ملفاتك وتخبرك بما ينقص قبل أن يراها المقيّم.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.t} className="group card relative overflow-hidden p-6 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
              <div className="absolute -left-4 -top-6 font-display text-[7rem] font-black text-forest-50 transition group-hover:text-forest-100">{i + 1}</div>
              <div className="relative">
                <div className="grid size-11 place-items-center rounded-2xl bg-forest-800 text-lime-brand">{s.icon}</div>
                <h3 className="mt-5 font-display text-lg font-semibold">{s.t}</h3>
                <p className="mt-2 text-[.95rem] leading-7 text-muted">{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ AI */}
      <section className="bg-forest-950 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-brand/15 px-3 py-1 text-sm text-lime-brand"><Bot className="size-4" /> مساعد ذكي يقرأ ملفاتك</div>
            <h2 className="mt-5 font-display text-3xl font-bold leading-snug md:text-4xl">اسحب ملفاتك… وسيخبرك ما ينقص</h2>
            <p className="mt-5 leading-8 text-white/70">يقرأ المساعد التقارير السنوية والقوائم المالية وتقارير الأثر، فيحدد نوع كل وثيقة والفترة التي تغطيها، ويستخرج الأرقام الأساسية، ويربطها بالعوامل التي تثبتها، ثم يكتب لك قائمة عملية بما يلزم إضافته قبل إرسال الطلب للمقيّم.</p>
            <ul className="mt-6 space-y-3 text-white/85">
              {['تحليل فوري لملفات PDF وWord وExcel والصور', 'قائمة نواقص مرتبة بالأولوية: البوابات أولاً', 'اقتراح مبدئي لمستوى كل عامل يراجعه المقيّم ويعتمده'].map(t => <li key={t} className="flex items-center gap-3"><span className="grid size-6 place-items-center rounded-full bg-lime-brand text-forest-950"><BadgeCheck className="size-4" /></span>{t}</li>)}
            </ul>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[.04] p-6 backdrop-blur">
            <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-lime-brand/40 bg-forest-900/60 p-8 text-center">
              <div className="pointer-events-none absolute inset-x-0 h-16 animate-scan bg-gradient-to-b from-transparent via-lime-brand/15 to-transparent" />
              <FileUp className="mx-auto size-10 text-lime-brand" />
              <div className="mt-3 font-display font-semibold">التقرير السنوي 2025.pdf</div>
              <div className="text-sm text-white/60">يُحلل الآن…</div>
            </div>
            <div className="mt-5 space-y-3">
              {[['تقرير سنوي · يغطي 2025', 'المصروفات 12.4 مليون · 4,200 مستفيد · 6 برامج', 'lime'], ['يثبت: F013 أهمية النتائج، F060 المساءلة', 'مستوى مقترح 2 لكل منهما بثقة متوسطة', 'green'], ['ينقص: تعريف النتيجة بعتبة ومستهدف (F127)', 'بوابة أساسية: ارفع وثيقة تعريف النتائج', 'orange']].map(([a, b, t]) => (
                <div key={a} className="flex items-start gap-3 rounded-xl bg-white/[.06] p-3.5">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${t === 'orange' ? 'bg-orange-brand' : t === 'lime' ? 'bg-lime-brand' : 'bg-forest-400'}`} />
                  <div><div className="text-sm font-semibold">{a}</div><div className="text-xs text-white/60">{b}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Method */}
      <section id="method" className="mx-auto max-w-7xl px-5 py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="text-sm font-semibold text-forest-600">المنهج</div>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">معادلة واحدة، شفافة، يمكن تتبعها</h2>
            <p className="mt-4 leading-8 text-muted">تُقدّر حال الجهة في كل عامل من 0 إلى 4 بالدليل، فتتحول المستويات إلى نقاط في أربعة محاور. ونقاط الأثر تُضرب في معامل قوة الأدلة، ثم تُطبق البوابات ومتطلبات المسار الحجمي والسقوف قبل تحديد المستوى.</p>
            <div className="mt-6 rounded-2xl border border-forest-200 bg-forest-50 p-5 font-display text-[1.05rem] font-semibold leading-9 text-forest-900">
              الدرجة = الموارد + القياس والأدلة + (الأثر × معامل الأدلة × معامل السلامة) + المساءلة
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[['البوابات', 'شروط لا تُعوَّض: تعريف النتيجة مسبقاً، والكلفة الكاملة، ومسار التغيير'], ['المسارات الحجمية', 'المطلوب يتدرج مع حجم الجهة: ناشئ، ومتوسط، وكبير'], ['الحد الأدنى للأثر', 'لا مستوى عالياً بأثر ضعيف مهما ارتفعت المحاور الأخرى'], ['الادعاء بقدر التغطية', 'الشهادة تذكر نسبة الإنفاق المقيس من برامجك']].map(([a, b]) => (
                <div key={a} className="card p-4"><div className="font-semibold text-forest-800">{a}</div><div className="mt-1 leading-6 text-muted">{b}</div></div>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[{ i: <Wallet />, n: '1', t: 'كفاءة الموارد', p: 30, d: 'كلفة المستفيد مقارنة بالمرجع العادل، مقروءة مع نسبة التحويل إلى نتيجة' },
              { i: <LineChart />, n: '2', t: 'جودة القياس والأدلة', p: 30, d: 'خط الأساس، والمؤشرات، والمتابعة، ودقة البيانات، وتغطية البرامج' },
              { i: <Target />, n: '3', t: 'الأثر لكل وحدة إنفاق', p: 30, d: 'كلفة النتيجة الصافية، وحجم التغيير، وأهميته للمستفيدين' },
              { i: <Scale />, n: '4', t: 'المساءلة', p: 10, d: 'قرارات البرامج تُتخذ بالأثر ويُساءل عنها' }].map(a => (
              <div key={a.n} className={`card relative overflow-hidden p-6 ${a.n === '3' ? 'bg-forest-900 text-white border-forest-900' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className={`grid size-11 place-items-center rounded-2xl ${a.n === '3' ? 'bg-lime-brand text-forest-950' : 'bg-forest-100 text-forest-800'}`}>{a.i}</div>
                  <div className={`font-display text-4xl font-black num ${a.n === '3' ? 'text-lime-brand' : 'text-forest-200'}`}>{a.p}</div>
                </div>
                <div className={`mt-4 text-xs ${a.n === '3' ? 'text-white/60' : 'text-muted'}`}>المحور {a.n}</div>
                <div className="font-display text-lg font-semibold">{a.t}</div>
                <p className={`mt-2 text-sm leading-6 ${a.n === '3' ? 'text-white/70' : 'text-muted'}`}>{a.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Pricing */}
      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-sm font-semibold text-forest-600">الأسعار</div>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">ابدأ بالتقييم، ووثّقه بالزيارة</h2>
            <p className="mt-4 text-muted">الشهادة تغطي السنة المالية الماضية بتقريرها، وتسري حتى نهاية السنة الحالية.{p.pricesIncludeVat ? ' الأسعار شاملة ضريبة القيمة المضافة.' : ` تضاف ضريبة القيمة المضافة ${p.vatRate}٪.`}</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <div className="card p-8">
              <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-forest-100 text-forest-800"><Gauge /></div><div className="font-display text-xl font-bold">تقييم كفاءة الأثر</div></div>
              <div className="mt-6 flex items-end gap-2"><span className="font-display text-5xl font-black num">{fmtNum(p.certificate)}</span><span className="mb-2 text-muted">ريال</span></div>
              <p className="mt-2 text-sm text-muted">نتيجة غير موثقة بمراجعة مقيّم خبير</p>
              <ul className="mt-6 space-y-3 text-[.95rem]">
                {['استبيان موجه للعوامل الـ56 مع شرح لكل سؤال', 'تحليل الملفات بالذكاء الاصطناعي وقائمة النواقص', 'مراجعة مقيّم معتمد لكل عامل بالدليل', 'الدرجة والمستوى والكتل الأربع', 'تقرير فجوات وتوصيات بأثرها على الدرجة', 'إفادة تقييم غير موثقة برمز تحقق'].map(t => <li key={t} className="flex items-center gap-3"><BadgeCheck className="size-5 shrink-0 text-forest-600" />{t}</li>)}
              </ul>
              <ButtonLink href="/register" variant="outline" className="mt-8 w-full">ابدأ الآن</ButtonLink>
            </div>
            <div className="relative overflow-hidden rounded-[1.25rem] bg-mesh p-8 text-white shadow-[var(--shadow-lift)]">
              <div className="absolute inset-0 bg-grid-dark opacity-60" />
              <div className="relative">
                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-lime-brand text-forest-950"><BadgeCheck /></div><div className="font-display text-xl font-bold">الشهادة الموثقة</div></div><span className="rounded-full bg-lime-brand px-3 py-1 text-xs font-bold text-forest-950">الأعلى ثقة</span></div>
                <div className="mt-6 flex items-end gap-2"><span className="text-white/60 mb-2">+</span><span className="font-display text-5xl font-black num">{fmtNum(p.visit)}</span><span className="mb-2 text-white/60">ريال زيارة التحقق</span></div>
                <p className="mt-2 text-sm text-white/65">بعد صدور النتيجة غير الموثقة</p>
                <ul className="mt-6 space-y-3 text-[.95rem] text-white/90">
                  {['زيارة ميدانية من مستشار معتمد', 'عينة تتبع لـ20 حالة من الطلب إلى النتيجة', 'مقابلات القيادة والمنفذين والمستفيدين', 'تحديث المستويات بعد التحقق', 'شهادة موثقة برقم ورمز تحقق عام', 'سارية حتى نهاية السنة الحالية'].map(t => <li key={t} className="flex items-center gap-3"><MapPin className="size-5 shrink-0 text-lime-brand" />{t}</li>)}
                </ul>
                <ButtonLink href="/register" variant="lime" className="mt-8 w-full">ابدأ بالتقييم</ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ CTA */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-forest-900 px-8 py-14 text-center text-white md:px-16">
          <div className="absolute inset-0 bg-grid-dark" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold md:text-4xl">أثرك يستحق أن يُرى بوضوح</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/70 leading-8">سجّل جهتك في دقائق، وستعرف من اليوم الأول ما الذي يثبته ملفك وما الذي ينقصه.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <ButtonLink href="/register" variant="lime" size="lg">سجّل جهتك</ButtonLink>
              <Link href="/verify" className="inline-flex h-13 items-center rounded-xl border border-white/20 px-7 font-semibold hover:bg-white/10">تحقق من شهادة</Link>
            </div>
          </div>
        </div>
      </section>
      <PublicFooter />
    </>
  );
}
