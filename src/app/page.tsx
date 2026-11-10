import Link from 'next/link';
import { ArrowLeft, BadgeCheck, ClipboardCheck, Cog, CreditCard, FileSearch, FileUp, Gauge, Globe2, Landmark, Layers, LineChart, MapPin, Scale, ShieldCheck, Target, Wallet } from 'lucide-react';
import { PublicHeader, PublicFooter } from '@/components/public-shell';
import { ButtonLink, EfficiencyLabel } from '@/components/ui';
import { getSetting } from '@/lib/settings';
import { fmtNum } from '@/lib/format';
import { CATALOG_FACTORS, CORE_FACTORS, SECTIONS } from '@/lib/domain';

export const dynamic = 'force-dynamic';

const SECTION_ICON: Record<string, React.ReactNode> = {
  impact: <Target />, resources: <Wallet />, measurement: <LineChart />, accountability: <Scale />, drivers: <Cog />,
};

/** أبرز المعايير والمنهجيات العالمية التي بُني عليها المنهج (مرجعية منهجية وليست اعتماداً من الجهات المذكورة) */
const FRAMEWORKS: { t: string; en: string; d: string }[] = [
  { t: 'نظرية التغيير', en: 'Theory of Change', d: 'ربط الأنشطة بالنتائج والأثر' },
  { t: 'الإطار المنطقي', en: 'Logical Framework', d: 'المدخلات والمخرجات والنتائج والأثر' },
  { t: 'العائد الاجتماعي على الاستثمار', en: 'SROI', d: 'تقدير القيمة الاجتماعية المتحققة' },
  { t: 'تحليل الكلفة والمنفعة', en: 'Cost-Benefit Analysis', d: 'منهجية «الكتاب الأخضر» الحكومية' },
  { t: 'فعالية الكلفة', en: 'Cost-Effectiveness', d: 'كلفة النتيجة الصافية مقارنة ببدائل التدخل' },
  { t: 'أبعاد الأثر الخمسة', en: 'Five Dimensions of Impact', d: 'مبادرة إدارة الأثر (IMP)' },
  { t: 'مؤشرات قياس الأثر', en: 'IRIS+', d: 'نظام المؤشرات من الشبكة العالمية للاستثمار المؤثر' },
  { t: 'مبادئ إدارة الأثر', en: 'Operating Principles for Impact Management', d: 'ممارسات إدارة الأثر عبر دورة الاستثمار' },
  { t: 'معايير الأثر للتنمية المستدامة', en: 'SDG Impact Standards · ISO 53001', d: 'معايير برنامج الأمم المتحدة الإنمائي والآيزو' },
  { t: 'دليل قياس الأثر الاجتماعي', en: 'EVPA Measurement Guide', d: 'الجمعية الأوروبية لخيرية المخاطر' },
  { t: 'معايير التقييم الستة', en: 'OECD-DAC Criteria', d: 'الملاءمة والاتساق والفاعلية والكفاءة والأثر والاستدامة' },
  { t: 'المساءلة القائمة على النتائج', en: 'Results-Based Accountability', d: 'وتحليل المساهمة في تفسير الأثر' },
];

export default async function Home() {
  const p = await getSetting('pricing');
  const steps = [
    { icon: <Landmark className="size-5" />, t: 'أنشئ حسابك وأضف جهتك', d: 'سجّل بالبريد أو عبر Google أو Facebook أو LinkedIn، ثم أكمل بيانات الجهة وارفع الترخيص والأوراق الأساسية. ويمكن للحساب الواحد إدارة أكثر من جهة.' },
    { icon: <CreditCard className="size-5" />, t: 'ادفع رسوم التقييم', d: `${fmtNum(p.certificate)} ريال عبر مدى أو البطاقات أو التحويل البنكي، وتبدأ التعبئة فوراً.` },
    { icon: <FileUp className="size-5" />, t: 'أجب وارفع ملفاتك', d: 'أسئلة واضحة لكل معيار، واسحب ملفاتك وأفلتها لترفعها بسهولة مع بيان ما يلزم من أدلة.' },
    { icon: <ClipboardCheck className="size-5" />, t: 'تقييم مهني من خبراء معتمدين', d: 'يراجع خبير معتمد كل معيار بالدليل وفق نماذج تقييم مكتوبة، ويمكنك مراسلته للاستفسار داخل المنصة.' },
    { icon: <Gauge className="size-5" />, t: 'نتيجتك وتقرير الفجوات', d: 'درجة من 100 ومستوى، وفجوات مرتبة بالأولوية، وتوصيات بأثرها على الدرجة.' },
    { icon: <BadgeCheck className="size-5" />, t: 'التوثيق وشهادة موثقة', d: 'زيارة تحقق ميدانية من خبير معتمد وتقرير تعقيبي، ثم شهادة موثقة برمز تحقق عام.' },
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
              <BadgeCheck className="size-4" /> تقييم مهني من خلال خبراء معتمدين
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.25] md:text-[3.4rem]">
              كم من <span className="text-lime-brand">الأثر الحقيقي</span><br />تصنعه جهتك بما لديها من موارد؟
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-9 text-white/75">
              شهادة كفاءة الأثر تقيس قدرة جهتك على تحويل مواردها إلى أثر حقيقي موثق، بمنهج من {CATALOG_FACTORS} معياراً منها {CORE_FACTORS} معياراً مركزياً، مستند إلى أبرز المعايير العالمية والمنهجيات المعتمدة، وتمنح جهتك مستوى يفهمه المانحون وخريطة واضحة للتطور.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/register" variant="lime" size="lg">ابدأ تقييم جهتك <ArrowLeft className="size-5" /></ButtonLink>
              <ButtonLink href="/verify" variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white border border-white/20">تحقق من شهادة</ButtonLink>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-4">
              {[[String(CATALOG_FACTORS), 'معياراً للتقييم'], [String(CORE_FACTORS), 'معياراً مركزياً'], ['5', 'فصول متكاملة']].map(([n, l]) => (
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
              <div className="mt-6 border-t border-line pt-5">
                <div className="mb-3 text-xs font-semibold text-muted">فصول التقييم الخمسة</div>
                <div className="flex flex-wrap gap-2">
                  {SECTIONS.map(s => <span key={s.key} className="rounded-full bg-forest-50 px-3 py-1 text-xs font-semibold text-forest-800">{s.title}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="spectrum relative h-1.5" />
      </section>

      {/* ------------------------------------------------ Trust */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-6 text-sm text-muted">
          <span className="flex items-center gap-2"><Layers className="size-4 text-forest-600" /> {CATALOG_FACTORS} معياراً منها {CORE_FACTORS} مركزياً</span>
          <span className="flex items-center gap-2"><FileSearch className="size-4 text-forest-600" /> مراجعة أكثر من 30 إطاراً ومنهجية عالمية</span>
          <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-forest-600" /> تقييم مهني من خبراء معتمدين</span>
          <span className="flex items-center gap-2"><MapPin className="size-4 text-forest-600" /> توثيق ميداني بتقرير تعقيبي</span>
        </div>
      </section>

      {/* ------------------------------------------------ How */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-sm font-semibold text-forest-600">رحلة التقييم</div>
          <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">ست خطوات واضحة من التسجيل إلى الشهادة</h2>
          <p className="mt-4 text-muted leading-8">تعرف في كل لحظة أين وصلت وما الخطوة التالية، وتستفسر من الخبير المراجع عبر المراسلة داخل المنصة.</p>
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

      {/* ------------------------------------------------ Method */}
      <section id="method" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-semibold text-forest-600">آلية التقييم</div>
            <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">منهج متكامل من {CATALOG_FACTORS} معياراً في خمسة فصول</h2>
            <p className="mt-4 leading-8 text-muted">يقدّر خبير معتمد حال جهتك في كل معيار بالدليل الذي ترفعه، وفق نماذج تقييم مكتوبة وبمستويات مفهومة للمانحين. ومن بين المعايير {CORE_FACTORS} معياراً مركزياً لقياس كفاءة الأثر، تُراجع بعمق أكبر وتُختبر ميدانياً عند التوثيق.</p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {SECTIONS.map((s, i) => (
              <div key={s.key} className="card relative overflow-hidden p-6">
                <div className="flex items-center justify-between">
                  <div className="grid size-11 place-items-center rounded-2xl bg-forest-800 text-lime-brand [&_svg]:size-5">{SECTION_ICON[s.key]}</div>
                  <div className="font-display text-4xl font-black num text-forest-200">{i + 1}</div>
                </div>
                <div className="mt-4 text-xs text-muted">الفصل {i + 1}</div>
                <div className="font-display text-lg font-semibold">{s.title}</div>
                <p className="mt-2 text-sm leading-6 text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-3 text-sm sm:grid-cols-3">
            {[['أدلة لكل معيار', 'تُربط الملفات التي ترفعها بالمعايير التي تثبتها، وتُعرف النواقص مبكراً'], ['مراجعة خبير معتمد', 'تقدير مهني لكل معيار، مع استيضاحات ومراسلة عند الحاجة'], ['نتيجة تقود للتطور', 'درجة ومستوى وتقرير فجوات بتوصيات مرتبة بأثرها']].map(([a, b]) => (
              <div key={a} className="rounded-2xl border border-forest-200 bg-forest-50 p-4"><div className="font-semibold text-forest-800">{a}</div><div className="mt-1 leading-6 text-muted">{b}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Global frameworks */}
      <section id="frameworks" className="bg-forest-950 text-white">
        <div className="mx-auto max-w-7xl px-5 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-lime-brand/15 px-3 py-1 text-sm text-lime-brand"><Globe2 className="size-4" /> مرجعية عالمية</div>
            <h2 className="mt-5 font-display text-3xl font-bold leading-snug md:text-4xl">مبني على أبرز المعايير العالمية والمنهجيات المعتمدة لقياس كفاءة الأثر</h2>
            <p className="mt-5 leading-8 text-white/70">راجع فريق «استديو صناع الأثر» أكثر من 30 إطاراً ومنهجية عالمية في قياس الأثر وكفاءته، واستخلص منها معايير قابلة للتطبيق على الجهات غير الربحية في المملكة. هذه أبرزها:</p>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRAMEWORKS.map(f => (
              <div key={f.t} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[.05] p-4 backdrop-blur">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-lime-brand text-forest-950"><BadgeCheck className="size-4" /></span>
                <div><div className="font-semibold">{f.t}</div><div dir="ltr" className="mt-0.5 text-right text-xs font-medium tracking-wide text-lime-brand/80">{f.en}</div><div className="mt-1 text-sm leading-6 text-white/60">{f.d}</div></div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-white/45">الجهات والأطر المذكورة مرجع منهجي استندت إليه الشهادة، ولا يعني ذكرها اعتماداً أو رعاية منها لشهادة كفاءة الأثر.</p>
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
              <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-forest-100 text-forest-800"><Gauge /></div><div className="font-display text-xl font-bold">التقييم المهني</div></div>
              <div className="mt-6 flex items-end gap-2"><span className="font-display text-5xl font-black num">{fmtNum(p.certificate)}</span><span className="mb-2 text-muted">ريال</span></div>
              <p className="mt-2 text-sm text-muted">نتيجة غير موثقة بمراجعة خبراء معتمدين</p>
              <ul className="mt-6 space-y-3 text-[.95rem]">
                {[`استبيان موجه لمعايير التقييم مع شرح لكل سؤال`, 'رفع الملفات بالسحب والإفلات وبيان ما يلزم من أدلة', 'تقييم مهني من خبراء معتمدين لكل معيار بالدليل', 'مراسلة الخبير المراجع للاستفسار داخل المنصة', 'الدرجة والمستوى وتقرير فجوات وتوصيات بأثرها على الدرجة', 'إفادة تقييم غير موثقة برمز تحقق'].map(t => <li key={t} className="flex items-center gap-3"><BadgeCheck className="size-5 shrink-0 text-forest-600" />{t}</li>)}
              </ul>
              <ButtonLink href="/register" variant="outline" className="mt-8 w-full">ابدأ الآن</ButtonLink>
            </div>
            <div className="relative overflow-hidden rounded-[1.25rem] bg-mesh p-8 text-white shadow-[var(--shadow-lift)]">
              <div className="absolute inset-0 bg-grid-dark opacity-60" />
              <div className="relative">
                <div className="flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-lime-brand text-forest-950"><BadgeCheck /></div><div className="font-display text-xl font-bold">التوثيق والشهادة الموثقة</div></div><span className="rounded-full bg-lime-brand px-3 py-1 text-xs font-bold text-forest-950">الأعلى ثقة</span></div>
                <div className="mt-6 flex items-end gap-2"><span className="font-display text-5xl font-black num">{fmtNum(p.visit)}</span><span className="mb-2 text-white/60">ريال</span></div>
                <p className="mt-2 text-sm text-white/65">التوثيق يشمل زيارة التحقق والتقرير التعقيبي، بعد صدور النتيجة غير الموثقة</p>
                <ul className="mt-6 space-y-3 text-[.95rem] text-white/90">
                  {['زيارة ميدانية من خبير تحقق معتمد', 'تقرير تعقيبي رسمي بنتيجة الزيارة وتوصياتها', 'عينة تتبع من الطلب إلى النتيجة', 'مقابلات القيادة والمنفذين والمستفيدين', 'تحديث المستويات بعد التحقق', 'شهادة موثقة برقم ورمز تحقق عام، سارية حتى نهاية السنة الحالية'].map(t => <li key={t} className="flex items-center gap-3"><MapPin className="size-5 shrink-0 text-lime-brand" />{t}</li>)}
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
