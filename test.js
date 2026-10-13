// Headless test: node test.js [baseUrl]  (needs puppeteer-core; fake camera = real person clip)
const puppeteer = require('puppeteer-core');
const BASE = process.argv[2] || 'http://localhost:8765/' + (process.env.QS || '');
const Y4M = process.env.Y4M || '/workspace/holo_test/person.y4m';
const OUT = process.env.OUT || '/workspace/holo_test';
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-video-capture=${Y4M}`,
      '--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  const watch = p => { p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); console.log('[' + m.type() + ']', m.text().slice(0, 200)); });
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('requestfailed', r => console.log('reqfail', r.url())); };
  const p = await b.newPage(); watch(p);
  await p.setViewport({ width: 412, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(BASE, { waitUntil: 'networkidle0' });
  await p.screenshot({ path: `${OUT}/shot_0_landing.png` });
  await p.click('#tap');
  await p.waitForFunction(() => window.__holo.ready && window.__holo.frames > 3, { timeout: 180000 });
  await new Promise(r => setTimeout(r, 4000));
  const st = () => p.evaluate(() => { const s = window.__holo; return { model: s.model, delegate: s.delegate, fps: +s.fps.toFixed(1), segMs: +s.segMs.toFixed(1), ui: document.getElementById('ui').className }; });
  console.log('STATE', JSON.stringify(await st()));
  await p.screenshot({ path: `${OUT}/shot_1_default.png` });
  await p.evaluate(() => { window.__holo.stage = true; });
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: `${OUT}/shot_2_stage.png` });
  await p.evaluate(() => { const s = window.__holo; s.stage = false; s.glow = false; });
  await p.mouse.click(200, 300); await new Promise(r => setTimeout(r, 800));
  await p.screenshot({ path: `${OUT}/shot_3_natural_overlay.png` });
  // desktop landscape (new page: changing isMobile reloads)
  const d = await b.newPage(); watch(d); await d.setViewport({ width: 1280, height: 720 });
  await d.goto(BASE, { waitUntil: 'networkidle0' }); await d.click('#tap');
  await d.waitForFunction(() => window.__holo.ready && window.__holo.frames > 3, { timeout: 180000 });
  await new Promise(r => setTimeout(r, 3000));
  await d.screenshot({ path: `${OUT}/shot_4_desktop.png` });
  console.log('ERRORS:', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
