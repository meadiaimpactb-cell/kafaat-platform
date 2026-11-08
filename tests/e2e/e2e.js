// اختبار شامل لرحلة منصة كفاءة الأثر من التسجيل حتى الشهادة الموثقة
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.env.BASE || 'http://localhost:3000';
const fs = require('fs');
const F = n => ({ name: n, mimeType: n.endsWith('.png') ? 'image/png' : 'application/pdf', buffer: fs.readFileSync(path.join(__dirname, 'files', n)) });
const SHOT = n => path.join(__dirname, 'shots', n + '.png'); require('fs').mkdirSync(path.join(__dirname, 'shots'), { recursive: true });
const log = (...a) => console.log('•', ...a);
const stamp = Date.now().toString().slice(-6);
const ORG_EMAIL = `e2e${stamp}@demo.sa`;
const errors = [];

async function ctx(b) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ar-SA' });
  const p = await c.newPage();
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
  return p;
}
async function login(p, email, pw) {
  await p.goto(BASE + '/login');
  await p.fill('input[name=email]', email); await p.fill('input[name=password]', pw);
  await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 }), p.click('button[type=submit]')]);
}
async function shot(p, n, full = false) { await p.waitForTimeout(400); await p.screenshot({ path: SHOT(n), fullPage: full }); log('shot', n); }
const expectUrl = async (p, re, t = 20000) => { await p.waitForURL(re, { timeout: t }); };

(async () => {
  const b = await chromium.launch();
  const org = await ctx(b);
  // 1) الصفحة الرئيسة
  await org.goto(BASE + '/'); await shot(org, '01-landing');
  // 2) التسجيل
  await org.goto(BASE + '/register');
  await org.fill('input[name=orgName]', 'جمعية تمكين للتنمية');
  await org.fill('input[name=name]', 'ريم الشهري');
  await org.fill('input[name=email]', ORG_EMAIL);
  await org.fill('input[name=phone]', '0551234567');
  await org.fill('input[name=password]', 'Test@12345');
  await org.check('input[name=agree]');
  await shot(org, '02-register');
  await Promise.all([expectUrl(org, /\/portal\/onboarding/), org.click('button[type=submit]')]);
  log('registered', ORG_EMAIL);
  // 3) البيانات الرئيسة
  await org.selectOption('select[name=orgType]', { label: 'جمعية أهلية' });
  await org.selectOption('select[name=field]', { index: 6 });
  await org.fill('input[name=licenseNo]', '1234');
  await org.fill('input[name=foundedYear]', '2012');
  await org.fill('textarea[name=description]', 'جمعية تعمل على التمكين الاقتصادي للأسر عبر التدريب المهني والتوظيف والإرشاد الأسري.');
  await shot(org, '03-onboarding-1');
  await org.click('button:has-text("التالي")');
  await org.selectOption('select[name=region]', { label: 'الرياض' });
  await org.fill('input[name=city]', 'الرياض');
  await org.fill('input[name=contactName]', 'ريم الشهري');
  await org.click('button:has-text("التالي")');
  await org.fill('input[name=lastYearExpenses]', '4,800,000');
  await org.fill('input[name=lastYearRevenue]', '5,100,000');
  await org.fill('input[name=programExpenses]', '3,950,000');
  await org.fill('input[name=beneficiariesCount]', '1240');
  await org.fill('input[name=programsCount]', '3');
  await org.fill('input[name=employeesCount]', '22');
  await shot(org, '04-onboarding-3');
  await Promise.all([expectUrl(org, /\/portal\/assessments\/new/), org.click('button[name=then]')]);
  await shot(org, '05-request');
  // 4) تأكيد الطلب والدفع بكود خصم
  await Promise.all([expectUrl(org, /\/portal\/checkout\//), org.click('button:has-text("تأكيد الطلب والمتابعة للدفع")')]);
  await org.fill('input[name=code]', 'LAUNCH25');
  await org.click('button:has-text("تطبيق")');
  await org.waitForSelector('text=طُبق كود الخصم');
  await shot(org, '06-checkout');
  const total = await org.locator('text=الإجمالي').locator('..').innerText(); log('total row:', total.replace(/\s+/g, ' '));
  await Promise.all([expectUrl(org, /\/pay\/sandbox\//), org.click('button:has-text("ادفع الآن")')]);
  await shot(org, '07-sandbox');
  await Promise.all([expectUrl(org, /\/portal\/assessments\/[^/]+\?paid=1/), org.click('button[value=success]')]);
  const aid = org.url().match(/assessments\/([^/?]+)/)[1]; log('assessment', aid);
  await shot(org, '08-paid-overview');
  // 5) الأسئلة
  await org.goto(`${BASE}/portal/assessments/${aid}/questions`);
  const ids = await org.$$eval('[id^="q-"]', els => els.map(e => e.id.slice(2)));
  log('factors in questions:', ids.length);
  const statuses = ['مطبّق وموثق', 'مطبّق جزئياً', 'مطبّق وموثق', 'مطبّق جزئياً', 'غير مطبّق'];
  for (let i = 0; i < ids.length; i++) {
    const card = org.locator('#q-' + ids[i]);
    if (!(await card.locator('textarea').count())) await card.locator('> button').click();
    await card.locator(`button:has-text("${statuses[i % 5]}")`).click();
    if (i % 2 === 0) await card.locator('button:has-text("متقدم:")').click();
    if (i < 3) await card.locator('textarea').fill('نقيس النتيجة لبرنامج التمكين الاقتصادي: 412 ملتحقاً، أكمل 360، وتوظف 186 خلال 6 أشهر، والمصدر سجل المتابعة.');
    if (i === 2) await shot(org, '09-questions');
  }
  await org.waitForSelector('text=حفظ تلقائي', { timeout: 20000 });
  await org.waitForTimeout(1500);
  // 6) رفع الملفات
  await org.goto(`${BASE}/portal/assessments/${aid}/documents`);
  const map0 = [['التقرير السنوي للسنة المالية المقيّمة', 'التقرير_السنوي_2025.pdf'], ['القوائم المالية المدققة', 'القوائم_المالية_المدققة_2025.pdf'], ['تقرير الكلفة الكاملة للبرامج', 'تحليل_كلفة_البرامج.pdf'], ['وثيقة تعريف النتائج', 'تعريف_النتائج.pdf'], ['نظرية التغيير أو الإطار المنطقي', 'نظرية_التغيير.pdf'], ['بيانات خط الأساس والقياس القبلي والبعدي', 'خط_الأساس.pdf'], ['سجل المستفيدين (دون بيانات شخصية)', 'سجل_المستفيدين.pdf'], ['وصف نظام جمع البيانات', 'نظام_البيانات.pdf'], ['قائمة البرامج وإنفاق كل برنامج', 'قائمة_البرامج_والإنفاق.pdf']];
  const map = map0;
  for (const [title, file] of map) {
    const row = org.locator('div.card', { has: org.locator('span.font-semibold', { hasText: title }) }).first();
    await row.locator('input[type=file]').setInputFiles(F(file));
    await org.waitForTimeout(1200);
  }
  await org.waitForTimeout(2500);
  await org.waitForFunction(() => !document.body.innerText.includes('جارٍ الرفع') && !document.body.innerText.includes('جارٍ الفهرسة') && !document.body.innerText.includes('يقرأ الملف'), null, { timeout: 60000 });
  await org.reload();
  await org.click('button:has-text("حلّل ملفي الآن")');
  await org.waitForSelector('text=الجاهزية للمراجعة', { timeout: 60000 });
  await shot(org, '10-documents', true);
  // 7) الإرسال
  await org.goto(`${BASE}/portal/assessments/${aid}`);
  await shot(org, '11-ready');
  await org.click('button:has-text("إرسال الملف للمراجعة")');
  await org.waitForSelector('text=أُرسل للمراجعة', { timeout: 30000 });
  log('submitted');

  // 8) الأدمن: الإسناد
  const admin = await ctx(b);
  await login(admin, 'admin@kafaat.sa', 'Admin@12345');
  await shot(admin, '12-admin-dashboard');
  await admin.goto(`${BASE}/admin/assessments/${aid}`);
  await admin.selectOption('select[name=assessorId]', { label: 'د. خالد الحربي' });
  await admin.click('button:has-text("حفظ الإسناد")');
  await admin.waitForSelector('text=حُفظ الإسناد');
  await shot(admin, '13-admin-assign');

  // 9) المقيّم
  const as = await ctx(b);
  await login(as, 'assessor@kafaat.sa', 'Assessor@12345');
  await shot(as, '14-assessor-dashboard');
  await as.goto(`${BASE}/assessor/assessments/${aid}`);
  await as.click('button:has-text("ابدأ المراجعة")');
  await as.waitForSelector('text=لدى المقيّم', { timeout: 15000 });
  const set = { F005: 3, F001: 3, F010: 3, F013: 2, F060: 3, F127: 3, F016: 3, F056: 3, F046: 3, F047: 3, F048: 3, F050: 2, F051: 3, F052: 3, F053: 3, F054: 2, F129: 3, F049: 2, F057: 2, F106: 2, F055: 2, F021: 3, F003: 3, F002: 3 };
  let first = true;
  for (const [fid, lv] of Object.entries(set)) {
    await as.locator('button', { has: as.locator(`span:text-is("${fid}")`) }).first().click();
    await as.waitForSelector('text=اختر المستوى المثبت بالأدلة');
    await as.keyboard.press(String(lv));
    if (first) {
      await as.locator('textarea').first().fill('كلفة نتيجة صافية محسوبة لبرنامجي التمكين والتدريب (82٪ من الإنفاق) بمرشحات موثقة، وفي حدود المرجع المعدّل.');
      await as.waitForTimeout(1200);
      await shot(as, '15-factor-window');
      await as.click('button:has-text("طلب استيضاح من الجهة")');
      await as.fill('textarea[name=message]', 'نرجو تزويدنا بورقة المرشحات الأربعة بنسبها ومصدر كل نسبة لبرنامج التمكين الاقتصادي.');
      await as.click('button:has-text("إرسال للجهة")');
      await as.waitForTimeout(1500);
      first = false;
    }
    await as.keyboard.press('Escape'); await as.keyboard.press('Escape');
    await as.waitForTimeout(250);
  }
  await as.waitForSelector('text=محفوظ', { timeout: 20000 });
  await as.waitForTimeout(1500);
  await as.reload();
  await as.click('button:has-text("اعتماد مقترحات المساعد للمتبقي")');
  await as.waitForTimeout(3500);
  await as.waitForLoadState('networkidle');
  await shot(as, '16-workspace', true);

  // 10) الجهة ترد على الاستيضاح
  await org.goto(`${BASE}/portal/assessments/${aid}/requests`);
  await org.fill('textarea[name=response]', 'رفعنا ورقة المرشحات ضمن «تقرير الكلفة الكاملة للبرامج» صفحة 4: الوزن الميت 20٪، الإسناد 15٪، الإزاحة 5٪، التلاشي 10٪.');
  await shot(org, '17-org-request');
  await org.click('button:has-text("إرسال الرد")');
  await org.waitForSelector('text=ردكم', { timeout: 15000 });
  log('responded');

  // 11) المقيّم يعتمد
  await as.goto(`${BASE}/assessor/assessments/${aid}`);
  await as.click('button:has-text("اعتماد التقييم")');
  await as.fill('textarea[name=summary]', 'ممارسات قياس ناضجة ونتائج صافية محسوبة لأغلب الإنفاق، مع حاجة إلى تصميم مقارن وتحقق مستقل لرفع الثقة في الأثر. سيتحقق المستشار من عينة التتبع وسجل المتابعة بعد 6 أشهر.');
  await shot(as, '18-final-window');
  await as.click('button:has-text("اعتماد وإصدار النتيجة غير الموثقة")');
  await as.waitForSelector('text=اعتُمد التقييم المكتبي', { timeout: 30000 });
  log('desk completed:', await as.locator('text=اعتُمد التقييم المكتبي').innerText());

  // 12) الجهة: النتيجة وطلب الزيارة
  await org.goto(`${BASE}/portal/assessments/${aid}/result`);
  await shot(org, '19-result', true);
  await org.goto(`${BASE}/portal/assessments/${aid}/verification`);
  await org.fill('input[name=preferredDates]', 'الأحد أو الثلاثاء صباحاً');
  await org.fill('input[name=location]', 'المقر الرئيس — حي النرجس، الرياض');
  await shot(org, '20-verification-request');
  await Promise.all([expectUrl(org, /\/portal\/checkout\//), org.click('button:has-text("متابعة إلى دفع رسوم الزيارة")')]);
  await shot(org, '21-visit-checkout');
  await Promise.all([expectUrl(org, /\/pay\/sandbox\//), org.click('button:has-text("ادفع الآن")')]);
  await Promise.all([expectUrl(org, /verification\?paid=1/), org.click('button[value=success]')]);
  log('visit paid');

  // 13) الأدمن يجدول الزيارة
  await admin.goto(`${BASE}/admin/visits`);
  const vcard = admin.locator('div.card', { hasText: 'جمعية تمكين للتنمية' }).first();
  await vcard.locator('select[name=consultantId]').selectOption({ label: 'د. خالد الحربي' });
  await vcard.locator('input[name=scheduledAt]').fill('2026-11-22T10:00');
  await vcard.locator('button:has-text("جدولة")').click();
  await admin.waitForSelector('text=جُدولت الزيارة');
  await shot(admin, '22-admin-visits');

  // 14) المستشار ينفذ الزيارة
  await as.goto(`${BASE}/assessor/visits`);
  await as.click('text=فتح ملف الزيارة >> nth=0');
  await as.waitForURL(/assessor\/visits\//);
  for (const k of ['sample', 'interviews', 'beneficiaries', 'system', 'records']) await as.check(`input[name=c_${k}]`);
  await as.fill('input[name=checked]', '20'); await as.fill('input[name=matched]', '18');
  await as.fill('input[name=sampleNotes]', 'حالتان دون توثيق المتابعة بعد 6 أشهر');
  await as.click('button:has-text("حفظ")');
  await as.waitForSelector('text=حُفظت بيانات الزيارة');
  await shot(as, '23-visit-work');
  const visitUrl = as.url();
  await as.goto(`${BASE}/assessor/assessments/${aid}`);
  await as.locator('button', { has: as.locator('span:text-is("F049")') }).first().click();
  await as.keyboard.press('3'); await as.waitForTimeout(1200);
  await as.keyboard.press('Escape');
  await as.goto(visitUrl);
  await as.click('button:has-text("إنهاء الزيارة")');
  await as.waitForSelector('text=الزيارة منجزة', { timeout: 15000 });
  log('visit completed');

  // 15) إصدار الشهادة الموثقة
  await admin.goto(`${BASE}/admin/assessments/${aid}`);
  await admin.click('button:has-text("اعتماد وإصدار الشهادة الموثقة")');
  await admin.waitForSelector('text=صدرت الشهادة الموثقة', { timeout: 30000 });
  log(await admin.locator('text=صدرت الشهادة الموثقة').innerText());
  await shot(admin, '24-admin-assessment', true);

  // 16) الجهة: الشهادة والفاتورة والتحقق
  await org.goto(`${BASE}/portal/certificates`);
  await shot(org, '25-certificates');
  const certHref = await org.locator('a:has-text("عرض وطباعة")').first().getAttribute('href');
  await org.goto(BASE + certHref); await shot(org, '26-certificate-print', true);
  await org.goto(`${BASE}/portal/payments`); await shot(org, '27-payments');
  const invHref = await org.locator('a:has-text("الفاتورة")').first().getAttribute('href');
  await org.goto(BASE + invHref); await shot(org, '28-invoice', true);
  await org.goto(`${BASE}/portal`); await shot(org, '29-portal-home');
  const verifyHref = await (async () => { await org.goto(`${BASE}/portal/certificates`); return org.locator('a:has-text("صفحة التحقق العامة")').first().getAttribute('href'); })();
  const pub = await ctx(b); await pub.goto(BASE + verifyHref); await shot(pub, '30-verify-public');

  // 17) التحويل البنكي واعتماده
  const o4 = await ctx(b);
  await login(o4, 'org4@demo.sa', 'Org@12345');
  await o4.goto(BASE + '/portal');
  await o4.click('a:has-text("إتمام الدفع")');
  await o4.waitForURL(/checkout/);
  await o4.click('label:has-text("تحويل بنكي")');
  await Promise.all([o4.waitForURL(/bank=1/), o4.click('button:has-text("عرض بيانات التحويل")')]);
  await o4.locator('input[name=receipt]').setInputFiles(F('receipt.png'));
  await shot(o4, '31-bank-transfer');
  await Promise.all([o4.waitForURL(/portal\/payments\?receipt=1/), o4.click('button:has-text("إرسال الإيصال للاعتماد")')]);
  await admin.goto(`${BASE}/admin/payments?status=AWAITING_APPROVAL`);
  await shot(admin, '32-admin-payments');
  await admin.locator('button:has-text("اعتماد")').first().click();
  await admin.waitForTimeout(2500);
  await o4.goto(BASE + '/portal'); await o4.waitForTimeout(500);
  const o4txt = await o4.locator('main').innerText(); log('org4 after approval has DATA_COLLECTION hint:', /تعبئة البيانات|الأسئلة/.test(o4txt));

  // 18) إعداد بوابة ميسر من لوحة التحكم وانعكاسها
  await admin.goto(`${BASE}/admin/settings/gateways`);
  const mc = admin.locator('div.card', { hasText: 'ميسر' }).first();
  await mc.locator('input[name=publishableKey]').fill('pk_test_demo123456');
  await mc.locator('input[name=secretKey]').fill('sk_test_demo123456');
  await mc.locator('input[name=enabled]').check();
  await mc.locator('button:has-text("حفظ")').click();
  await admin.waitForSelector('text=أصبحت متاحة في صفحة الدفع');
  await shot(admin, '33-gateways', true);
  const o5 = await ctx(b); await login(o5, 'org@demo.sa', 'Org@12345');
  // كود خصم جديد من اللوحة
  await admin.goto(`${BASE}/admin/coupons`);
  await admin.fill('input[name=code]', 'E2E' + stamp); await admin.fill('input[name=value]', '50');
  await admin.click('button:has-text("إنشاء الكود")'); await admin.waitForSelector('text=أُنشئ الكود');
  await shot(admin, '34-coupons');
  // تعطيل ميسر بعد الاختبار
  await admin.goto(`${BASE}/admin/settings/gateways`);
  const mc2 = admin.locator('div.card', { hasText: 'ميسر' }).first();
  await mc2.locator('input[name=enabled]').uncheck(); await mc2.locator('button:has-text("حفظ")').click(); await admin.waitForSelector('text=حُفظت البوابة (معطّلة)');
  // صفحات أخرى للأدمن
  for (const [u, n] of [['/admin/users', '35-users'], ['/admin/settings/pricing', '36-pricing'], ['/admin/settings/ai', '37-ai'], ['/admin/assessments', '38-assessments'], ['/admin/settings/requirements', '39-requirements'], ['/admin/methodology', '40-methodology'], ['/admin/audit', '41-audit'], ['/admin/certificates', '42-admin-certs'], ['/admin/organizations', '43-orgs']]) { await admin.goto(BASE + u); await shot(admin, n); }
  // مدير الحساب بصلاحيات محدودة
  const mg = await ctx(b); await login(mg, 'manager@kafaat.sa', 'Manager@12345');
  await shot(mg, '44-manager-dashboard');
  await mg.goto(BASE + '/admin/settings/gateways'); log('manager gateways ->', mg.url());
  // صفحات المقيّم الإضافية
  await as.goto(BASE + '/assessor/methodology'); await shot(as, '45-assessor-library');
  // جوال
  const mob = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true }); const mp = await mob.newPage();
  await mp.goto(BASE + '/'); await mp.screenshot({ path: SHOT('46-mobile-landing') });
  await mp.goto(BASE + '/login'); await mp.fill('input[name=email]', ORG_EMAIL); await mp.fill('input[name=password]', 'Test@12345'); await Promise.all([mp.waitForURL(/portal/), mp.click('button[type=submit]')]);
  await mp.goto(`${BASE}/portal/assessments/${aid}/result`); await mp.screenshot({ path: SHOT('47-mobile-result') });

  console.log('\nERRORS:', errors.length ? errors.join('\n') : 'none');
  console.log('ORG', ORG_EMAIL, 'AID', aid);
  await b.close();
})().catch(e => { console.error('FAILED:', e.message); console.log('ERRORS:', errors.join('\n')); process.exit(1); });
