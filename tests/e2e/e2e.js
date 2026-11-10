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
const ORG_NAME = `جمعية تمكين ${stamp}`;
const errors = [];

async function ctx(b) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'ar-SA' });
  const p = await c.newPage();
  p.on('dialog', d => d.accept());
  p.on('pageerror', e => errors.push('pageerror: ' + p.url() + ' ' + e.message.slice(0, 90)));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text().slice(0, /hydrat|match/i.test(m.text()) ? 3000 : 200)); });
  return p;
}
async function login(p, email, pw) {
  await p.goto(BASE + '/login');
  await p.fill('input[name=email]', email); await p.fill('input[name=password]', pw);
  await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 }), p.click('button[type=submit]')]);
}
async function shot(p, n, full = false) { await p.waitForTimeout(400); await p.screenshot({ path: SHOT(n), fullPage: full }); log('shot', n); }
const selByText = async (p, sel, re) => { const v = await p.locator(sel + ' option').evaluateAll((os, src) => { const r = new RegExp(src); const o = os.find(x => r.test(x.textContent)); return o ? o.value : null; }, re.source); if (!v) throw new Error('no option ' + re); await p.locator(sel).selectOption(v); };
const expectUrl = async (p, re, t = 20000) => { await p.waitForURL(re, { timeout: t }); };

(async () => {
  const b = await chromium.launch();
  const org = await ctx(b);
  // 1) الصفحة الرئيسة
  await org.goto(BASE + '/'); await shot(org, '01-landing');
  // 2) التسجيل: حساب شخصي (بلا جهة) مع خيارات التسجيل الاجتماعي وإظهار كلمة المرور
  await org.goto(BASE + '/register');
  for (const t of ['Google', 'Facebook', 'LinkedIn']) if (!(await org.locator(`text=${t}`).count())) errors.push('missing social button ' + t);
  await org.fill('input[name=name]', 'ريم الشهري');
  await org.fill('input[name=email]', ORG_EMAIL);
  await org.fill('input[name=phone]', '0551234567');
  await org.fill('input[name=password]', 'Test@12345');
  const pwType0 = await org.locator('input[name=password]').getAttribute('type');
  await org.click('button[aria-label*="إظهار"]');
  const pwType1 = await org.locator('input[name=password]').getAttribute('type');
  if (pwType0 !== 'password' || pwType1 !== 'text') errors.push(`show-password toggle broken: ${pwType0} -> ${pwType1}`);
  await org.check('input[name=agree]');
  await shot(org, '02-register');
  await Promise.all([expectUrl(org, /\/portal\/onboarding/), org.click('button[type=submit]')]);
  log('registered personal account', ORG_EMAIL);
  // محاولة تقديم طلب قبل إكمال بيانات الجهة تُحوَّل إلى الإكمال
  await org.goto(BASE + '/portal/assessments/new'); await org.waitForURL(/portal\/onboarding/, { timeout: 15000 }); log('gate: new request redirected to onboarding');
  // 3) بيانات الجهة الأساسية والترخيص
  await org.fill('input[name=name]', ORG_NAME);
  await org.selectOption('select[name=orgType]', { label: 'جمعية أهلية' });
  await org.selectOption('select[name=field]', { index: 6 });
  await org.fill('input[name=licenseNo]', '1234');
  await org.selectOption('select[name=licenseIssuer]', { index: 1 });
  await org.fill('input[name=licenseIssueDate]', '2015-03-01');
  await org.fill('input[name=foundedYear]', '2012');
  await org.fill('textarea[name=description]', 'جمعية تعمل على التمكين الاقتصادي للأسر عبر التدريب المهني والتوظيف والإرشاد الأسري.');
  await shot(org, '03-onboarding-1');
  await org.click('button:has-text("التالي")');
  await org.selectOption('select[name=region]', { label: 'الرياض' });
  await org.fill('input[name=city]', 'الرياض');
  await org.fill('input[name=address]', 'حي النرجس، طريق الأمير سلطان');
  await org.fill('input[name=phone]', '0112345678');
  await org.fill('input[name=email]', 'info@tamkeen-e2e.sa');
  await org.click('button:has-text("التالي")');
  await org.fill('input[name=repName]', 'ريم الشهري'); await org.fill('input[name=repTitle]', 'المدير التنفيذي');
  await org.fill('input[name=repPhone]', '0551234567'); await org.fill('input[name=repEmail]', 'rep@tamkeen-e2e.sa');
  await org.click('button:has-text("التالي")');
  await org.fill('input[name=lastYearExpenses]', '4,800,000');
  await org.fill('input[name=lastYearRevenue]', '5,100,000');
  await org.fill('input[name=programExpenses]', '3,950,000');
  await org.fill('input[name=beneficiariesCount]', '1240');
  await org.fill('input[name=programsCount]', '3');
  await org.fill('input[name=employeesCount]', '22');
  await shot(org, '04-onboarding-3');
  await Promise.all([org.waitForURL(/portal\/onboarding\?.*saved=1/, { timeout: 20000 }), org.click('button:has-text("حفظ ومتابعة لرفع المستندات")')]);
  log('org profile saved; now documents');
  // مستندات الجهة: سحب وإفلات فعلي (أحداث drop) بما فيها ملف بلا نوع MIME، ثم اختيار عبر النافذة
  const dropFile = async (page, zone, name, mime, text) => {
    const dt = await page.evaluateHandle(({ name, mime, text }) => { const d = new DataTransfer(); d.items.add(new File([text], name, { type: mime })); return d; }, { name, mime, text });
    await zone.dispatchEvent('dragenter', { dataTransfer: dt }); await zone.dispatchEvent('dragover', { dataTransfer: dt }); await zone.dispatchEvent('drop', { dataTransfer: dt });
  };
  const zone = label => org.locator('div.card', { has: org.locator('span.font-semibold', { hasText: label }) }).first();
  await dropFile(org, zone('ترخيص'), 'license.pdf', 'application/pdf', '%PDF-1.4 license');
  await org.waitForSelector('text=license.pdf', { timeout: 20000 }); log('drop #1 (pdf) ok');
  await dropFile(org, zone('النظام الأساسي'), 'bylaws.pdf', '', '%PDF-1.4 bylaws'); // MIME فارغ
  await org.waitForSelector('text=bylaws.pdf', { timeout: 20000 }); log('drop #2 (empty MIME) ok');
  await zone('تفويض').locator('input[type=file]').setInputFiles({ name: 'auth-letter.png', mimeType: 'image/png', buffer: F('receipt.png').buffer });
  await org.waitForSelector('text=auth-letter.png', { timeout: 20000 }); log('file chooser upload ok');
  // ملف غير مدعوم يعطي رسالة واضحة بدل الصمت
  await dropFile(org, zone('ترخيص'), 'virus.exe', 'application/x-msdownload', 'x');
  await org.waitForSelector('text=virus.exe', { timeout: 10000 }); log('unsupported file shows a visible error');
  await shot(org, '04b-org-docs', true);
  await org.waitForSelector('text=قيد التوثيق', { timeout: 15000 }).catch(() => errors.push('org did not move to pending verification after documents'));
  await org.goto(BASE + '/portal/assessments/new'); await org.waitForURL(/portal\/assessments\/new/, { timeout: 15000 });
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
  await org.reload();
  // إسقاط ملف بالسحب على بند مطلوب (MIME فارغ) في مركز الملفات: يجب أن يُرفع ويظهر
  const reqRow = org.locator('div.card', { has: org.locator('span.font-semibold', { hasText: 'محاضر قرارات الأثر' }) }).first();
  const dt = await org.evaluateHandle(() => { const d = new DataTransfer(); d.items.add(new File(['محاضر'], 'board-minutes.pdf', { type: '' })); return d; });
  await reqRow.dispatchEvent('dragenter', { dataTransfer: dt }); await reqRow.dispatchEvent('dragover', { dataTransfer: dt }); await reqRow.dispatchEvent('drop', { dataTransfer: dt });
  await org.waitForSelector('text=board-minutes.pdf', { timeout: 20000 }); log('drag-drop onto a requirement row ok');
  const docsTxt = await org.locator('main').innerText();
  if (/ذكاء|يحلل|تحليل الملف|حلّل ملفي/.test(docsTxt)) errors.push('documents page still shows analysis wording');
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
  await selByText(admin, 'select[name=assessorId]', /د\. خالد الحربي/);
  await admin.click('button:has-text("حفظ إسناد المرحلة المكتبية")');
  await admin.waitForSelector('text=حُفظ إسناد مرحلة التقرير غير الموثق');
  await shot(admin, '13-admin-assign');
  // الأدمن يوثّق الجهة (التوثيق شرط للشهادة الموثقة لا للتقديم)
  await admin.goto(`${BASE}/admin/organizations?verification=PENDING&q=` + encodeURIComponent(ORG_NAME));
  await admin.locator('a', { hasText: ORG_NAME }).first().click();
  await admin.waitForURL(/admin\/organizations\//);
  await admin.check('input[name=matched]');
  await admin.click('button:has-text("توثيق الجهة")');
  await admin.waitForSelector('text=وُثّقت الجهة');
  await shot(admin, '13b-org-verified', true); log('org verified by admin');
  // الجهة ترى حالة «موثقة» دون أن يوقفها شيء
  await org.goto(`${BASE}/portal/organizations`); await org.waitForSelector('text=موثق');

  // مراسلة الخبير دون كشف هويته: الجهة تسأل، والخبير يرد، والجهة ترى «الخبير المراجع» فقط
  await org.goto(`${BASE}/portal/messages/${aid}`);
  await org.fill('textarea[name=body]', 'هل يكفي التقرير السنوي لإثبات تعريف النتائج أم نرفع وثيقة مستقلة؟');
  await org.click('button:has-text("إرسال")'); await org.waitForSelector('text=هل يكفي التقرير السنوي');
  const as0 = await ctx(b); await login(as0, 'assessor@kafaat.sa', 'Assessor@12345');
  await as0.goto(`${BASE}/assessor/messages/${aid}`);
  await as0.waitForSelector('text=هل يكفي التقرير السنوي');
  await as0.fill('textarea[name=body]', 'يفضل رفع وثيقة مستقلة لتعريف النتائج مع العتبة والمستهدف.');
  await as0.click('button:has-text("إرسال")'); await as0.waitForSelector('text=يفضل رفع وثيقة مستقلة');
  await org.goto(`${BASE}/portal/messages/${aid}`);
  const thread = await org.locator('main').innerText();
  if (!thread.includes('الخبير المراجع')) errors.push('org thread does not label the expert as «الخبير المراجع»');
  for (const leak of ['خالد', 'الحربي', 'assessor@']) if (thread.includes(leak)) errors.push('expert identity leaked to org in messages: ' + leak);
  const ov = await org.goto(`${BASE}/portal/assessments/${aid}`).then(() => org.locator('main').innerText());
  for (const leak of ['خالد', 'الحربي', 'assessor@']) if (ov.includes(leak)) errors.push('expert identity leaked on org overview: ' + leak);
  await shot(org, '13c-org-messages'); log('anonymous messaging ok');
  await admin.goto(`${BASE}/admin/messages/${aid}`); await admin.waitForSelector('text=يفضل رفع وثيقة مستقلة');

  // 9) المقيّم
  const as = await ctx(b);
  await login(as, 'assessor@kafaat.sa', 'Assessor@12345');
  await shot(as, '14-assessor-dashboard');
  await as.goto(`${BASE}/assessor/assessments/${aid}`);
  await as.click('button:has-text("ابدأ المراجعة")');
  await as.waitForSelector('text=لدى الخبير المراجع', { timeout: 15000 });
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
  await org.fill('input[name=siteContactName]', 'سلطان العتيبي'); await org.fill('input[name=siteContactPhone]', '0559998877');
  await shot(org, '20-verification-request');
  await Promise.all([expectUrl(org, /\/portal\/checkout\//), org.click('button:has-text("متابعة إلى دفع رسوم التوثيق")')]);
  await shot(org, '21-visit-checkout');
  await Promise.all([expectUrl(org, /\/pay\/sandbox\//), org.click('button:has-text("ادفع الآن")')]);
  await Promise.all([expectUrl(org, /verification\?paid=1/), org.click('button[value=success]')]);
  log('visit paid');

  // 13) الأدمن يسند خبير التحقق ويجدول الزيارة (الاستقلال: خبير التحقق غير المقيّم المكتبي)
  await admin.goto(`${BASE}/admin/assessments/${aid}`);
  const optTexts = await admin.locator('select[name=verifierId] option').allInnerTexts();
  if (optTexts.some(t => /خالد الحربي/.test(t))) errors.push('desk assessor is offered as verifier (independence rule)'); else log('independence: desk assessor not offered as verifier');
  await selByText(admin, 'select[name=verifierId]', /نورة القحطاني/);
  await admin.click('button:has-text("حفظ إسناد التحقق")'); await admin.waitForSelector('text=حُفظ إسناد');
  await admin.goto(`${BASE}/admin/visits`);
  const vcard = admin.locator('div.card', { hasText: ORG_NAME }).first();
  await selByText(vcard, 'select[name=consultantId]', /نورة القحطاني/);
  await vcard.locator('input[name=scheduledAt]').fill('2026-12-22T10:00');
  await vcard.locator('button:has-text("جدولة الزيارة")').click();
  await vcard.locator('button:has-text("تحديث / إعادة جدولة"), :text("لدى الخبير زيارة أخرى")').first().waitFor({ timeout: 20000 });
  if (await vcard.locator(':text("لدى الخبير زيارة أخرى")').count()) { log('conflict warning shown (expected on repeated runs); overriding'); await vcard.locator('input[name=force]').check(); await vcard.locator('button:has-text("جدولة الزيارة")').click(); }
  await vcard.locator('button:has-text("تحديث / إعادة جدولة")').waitFor({ timeout: 20000 }).catch(async () => { errors.push('visit scheduling failed: ' + (await vcard.innerText()).slice(-300).replace(/\s+/g, ' ')); });
  await shot(admin, '22-admin-visits');

  // الجهة تؤكد الموعد وترى بيانات خبير التحقق (مُظهَر افتراضياً في مرحلة التحقق)
  await org.goto(`${BASE}/portal/assessments/${aid}/verification`);
  if (!(await org.locator('button:has-text("أؤكد الموعد")').count())) { console.log('VERIFICATION PAGE TEXT:\n', (await org.locator('main').innerText()).slice(0, 1500)); await shot(org, 'dbg-confirm', true); }
  await org.click('button:has-text("أؤكد الموعد")'); await org.waitForSelector('button:has-text("أؤكد الموعد")', { state: 'detached', timeout: 20000 });
  log('org confirmed the visit');

  // 14) خبير التحقق ينفذ الزيارة: بدء، سجل، إنهاء، ثم التقرير التعقيبي
  const as2 = await ctx(b); await login(as2, 'assessor2@kafaat.sa', 'Assessor@12345');
  await as2.goto(`${BASE}/assessor/visits`);
  await as2.locator('tr', { hasText: ORG_NAME }).first().locator('a:has-text("فتح ملف الزيارة")').click();
  await as2.waitForURL(/assessor\/visits\//);
  const visitUrl = as2.url();
  const startBtn = as2.locator('button:has-text("بدء الزيارة")'); if (await startBtn.count()) { await startBtn.click(); await as2.waitForSelector('text=بدأت الزيارة'); log('visit started'); }
  await as2.goto(visitUrl);
  for (const k of ['sample', 'interviews', 'beneficiaries', 'system', 'records']) await as2.check(`input[name=c_${k}]`);
  await as2.fill('input[name=checked]', '20'); await as2.fill('input[name=matched]', '18');
  await as2.fill('input[name=sampleNotes]', 'حالتان دون توثيق المتابعة بعد 6 أشهر');
  await as2.click('button:has-text("حفظ"):not(:has-text("مسودة"))');
  await as2.waitForSelector('text=حُفظت بيانات الزيارة');
  await shot(as2, '23-visit-work');
  await as2.goto(`${BASE}/assessor/assessments/${aid}`);
  await as2.locator('button', { has: as2.locator('span:text-is("F049")') }).first().click();
  await as2.keyboard.press('3'); await as2.waitForTimeout(1200);
  await as2.keyboard.press('Escape');
  await as2.goto(visitUrl);
  await as2.click('button:has-text("إنهاء الزيارة")');
  await as2.waitForSelector('button:has-text("إنهاء الزيارة")', { state: 'detached', timeout: 15000 }).catch(async () => { errors.push('complete visit failed: ' + (await as2.locator('main').innerText()).slice(-400).replace(/\s+/g, ' ')); });
  log('visit completed');
  await as2.goto(visitUrl);
  await as2.fill('textarea[name=summary]', 'تطابقت السجلات الميدانية مع الملفات المرفوعة في أغلب الحالات المفحوصة.');
  await as2.fill('textarea[name=strengths]', 'نظام بيانات موحد\nقرارات مرتبطة بالنتائج');
  await as2.fill('textarea[name=findings]', 'حالتان دون توثيق المتابعة بعد 6 أشهر');
  await as2.fill('textarea[name=recommendations]', 'توثيق قياس المتابعة لكل برنامج\nأتمتة تقرير سجل المستفيدين');
  await as2.click('button:has-text("حفظ كمسودة")'); await as2.waitForSelector('text=حُفظت مسودة التقرير التعقيبي');
  // الجهة لا ترى المسودة
  await org.goto(`${BASE}/portal/assessments/${aid}/verification`);
  if (await org.locator('a[href^="/print/followup/"]').count()) errors.push('draft follow-up visible to org');
  await as2.click('button:has-text("نشر للجهة")'); await as2.waitForSelector('text=ولا يمكن تعديله', { timeout: 20000 });
  log('follow-up report published');
  await org.goto(`${BASE}/portal/assessments/${aid}/verification`);
  const fuHref = await org.locator('a[href^="/print/followup/"]').first().getAttribute('href');
  if (!fuHref) errors.push('published follow-up link missing for org'); else { await org.goto(BASE + fuHref); await org.waitForSelector('text=التقرير التعقيبي'); await shot(org, '23b-followup-print', true); }

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
