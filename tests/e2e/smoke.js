// اختبار دخان: يزور كل صفحات كل دور ببيانات التجربة ويتأكد من خلوها من الأخطاء
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const A = process.env.SMOKE_ASSESSMENT; // اختياري
const errors = []; let pages = 0;

async function session(b, email, pw) {
  const c = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-SA' }); const p = await c.newPage();
  p.on('pageerror', e => errors.push(`pageerror ${p.url()}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(`console ${p.url()}: ${m.text().slice(0, 160)}`); });
  if (email) {
    await p.goto(BASE + '/login'); await p.fill('input[name=email]', email); await p.fill('input[name=password]', pw);
    await Promise.all([p.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 }), p.click('button[type=submit]')]);
  }
  return p;
}
async function visit(p, url, mustHave) {
  const r = await p.goto(BASE + url, { waitUntil: 'networkidle' }); pages++;
  const status = r ? r.status() : 0; const body = await p.locator('body').innerText();
  if (status >= 400) errors.push(`HTTP ${status} ${url}`);
  if (/Application error|Unhandled Runtime Error|This page couldn’t load|حدث خطأ غير متوقع/.test(body)) errors.push(`runtime error on ${url}: ${body.slice(0, 120)}`);
  if (/ذكاء اصطناعي|الذكاء الاصطناعي|Claude/.test(body) && !url.startsWith('/admin') && !url.startsWith('/assessor')) errors.push(`AI wording on ${url}`);
  if (mustHave && !body.includes(mustHave)) errors.push(`missing "${mustHave}" on ${url}`);
  return p;
}
const ids = async (p, sel, re) => (await p.$$eval(sel, els => els.map(e => e.getAttribute('href')))).filter(h => h && re.test(h));

(async () => {
  const b = await chromium.launch();
  // عام
  let p = await session(b);
  for (const [u, t] of [['/', 'آلية التقييم'], ['/login', ''], ['/register', ''], ['/forgot-password', ''], ['/verify', ''], ['/verify/DEMOATHAR1', '']]) await visit(p, u, t);
  const home = await p.goto(BASE + '/').then(() => p.locator('body').innerText());
  for (const bad of ['اسحب ملفاتك… وسيخبرك', 'الدرجة = ', 'معامل الأدلة', 'الذكاء']) if (home.includes(bad)) errors.push('landing still has: ' + bad);
  for (const must of ['132', '56', '500', '5,000', 'تقييم مهني من خلال خبراء معتمدين', 'تقرير تعقيبي']) if (!home.replace(/٬/g, ',').includes(must)) errors.push('landing missing: ' + must);

  // الجهة
  p = await session(b, 'org@demo.sa', 'Org@12345');
  for (const u of ['/portal', '/portal/organizations', '/portal/assessments', '/portal/certificates', '/portal/payments', '/portal/notifications', '/portal/messages', '/portal/onboarding']) await visit(p, u);
  await p.goto(BASE + '/portal/assessments'); const links = await ids(p, 'a', /^\/portal\/assessments\/[a-z0-9]+$/);
  for (const l of [...new Set(links)].slice(0, 2)) for (const s of ['', '/documents', '/questions', '/requests', '/result', '/verification']) await visit(p, l + s);
  await p.goto(BASE + '/portal/messages'); for (const l of [...new Set(await ids(p, 'a', /^\/portal\/messages\/.+/))].slice(0, 2)) await visit(p, l);
  // جهة ثانية للحساب نفسه (الحسابات متعددة الجهات)
  await p.goto(BASE + '/portal/organizations'); const t = await p.locator('body').innerText();
  if (!t.includes('جمعية الغد للتطوع') || !t.includes('جمعية النماء')) errors.push('multi-org account does not list both orgs');
  p = await session(b, 'org3@demo.sa', 'Org@12345');
  await p.goto(BASE + '/portal/assessments'); const l3 = await ids(p, 'a', /^\/portal\/assessments\/[a-z0-9]+$/);
  for (const l of [...new Set(l3)].slice(0, 1)) { for (const s of ['', '/result', '/verification']) await visit(p, l + s); }
  const vtxt = await p.locator('body').innerText();
  p.__v = vtxt;
  const fu = await ids(p, 'a', /^\/print\/followup\//); if (!fu.length) errors.push('verified org does not see published follow-up link');
  for (const l of fu.slice(0, 1)) await visit(p, l, 'التقرير التعقيبي');
  // طباعة
  for (const l of (await ids(p, 'a', /^\/print\//)).slice(0, 3)) await visit(p, l);

  // الإدارة
  p = await session(b, 'admin@kafaat.sa', 'Admin@12345');
  for (const u of ['/admin', '/admin/assessments', '/admin/assessments?status=SUBMITTED&q=%D8%AC%D9%85%D8%B9%D9%8A%D8%A9', '/admin/organizations', '/admin/organizations?verification=PENDING', '/admin/visits', '/admin/visits?consultant=none', '/admin/payments', '/admin/certificates', '/admin/coupons', '/admin/users', '/admin/audit', '/admin/notifications', '/admin/outbox', '/admin/messages', '/admin/methodology', '/admin/search?q=%D8%A7%D9%84%D9%86%D9%85%D8%A7%D8%A1', '/admin/settings/pricing', '/admin/settings/social', '/admin/settings/gateways', '/admin/settings/requirements', '/admin/settings/ai']) await visit(p, u);
  await p.goto(BASE + '/admin/assessments'); for (const l of [...new Set(await ids(p, 'a', /^\/admin\/assessments\/[a-z0-9]+$/))].slice(0, 4)) await visit(p, l);
  await p.goto(BASE + '/admin/organizations'); for (const l of [...new Set(await ids(p, 'a', /^\/admin\/organizations\/[a-z0-9]+$/))].slice(0, 6)) await visit(p, l);
  await p.goto(BASE + '/admin/messages'); for (const l of [...new Set(await ids(p, 'a', /^\/admin\/messages\/.+/))].slice(0, 2)) await visit(p, l);
  // تسعير
  await p.goto(BASE + '/admin/settings/pricing'); const pv = await p.locator('input[name=certificate]').inputValue().catch(() => ''); if (pv && Number(pv.replace(/,/g, '')) !== 500) errors.push('pricing certificate != 500: ' + pv);

  // الخبير
  p = await session(b, 'assessor@kafaat.sa', 'Assessor@12345');
  for (const u of ['/assessor', '/assessor/assessments', '/assessor/visits', '/assessor/messages', '/assessor/notifications', '/assessor/methodology']) await visit(p, u);
  await p.goto(BASE + '/assessor/assessments'); for (const l of [...new Set(await ids(p, 'a', /^\/assessor\/assessments\/[a-z0-9]+$/))].slice(0, 2)) await visit(p, l);
  await p.goto(BASE + '/assessor/visits'); for (const l of [...new Set(await ids(p, 'a', /^\/assessor\/visits\/[a-z0-9]+$/))].slice(0, 2)) await visit(p, l);
  await p.goto(BASE + '/assessor/messages'); for (const l of [...new Set(await ids(p, 'a', /^\/assessor\/messages\/.+/))].slice(0, 2)) await visit(p, l);

  await b.close();
  console.log(`زُيرت ${pages} صفحة`);
  if (errors.length) { console.log('✗ أخطاء:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
  console.log('✓ لا أخطاء');
})().catch(e => { console.error(e); process.exit(1); });
