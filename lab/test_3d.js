const puppeteer = require('puppeteer-core');
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: 412, height: 860, isMobile: true, hasTouch: true });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); console.log('[' + m.type() + ']', m.text()); });
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('requestfailed', r => console.log('reqfail', r.url()));
  await p.goto('http://localhost:8765/', { waitUntil: 'networkidle0' });
  await p.click('#btnCam');
  await p.waitForFunction(() => /Live\. Depth/.test(document.getElementById('status').textContent), { timeout: 240000 }).catch(e => errs.push('timeout'));
  await new Promise(r => setTimeout(r, 4000));
  console.log('STATUS:', await p.$eval('#status', e => e.textContent));
  await p.screenshot({ path: 'test_screenshot_3d.png' });
  await p.evaluate(() => { document.getElementById('chkSeg').click(); const h = window.__holo; h.controls.__moved = true; h.camera.position.set(2.2, 0.8, 2.4); });
  await new Promise(r => setTimeout(r, 5000));
  await p.screenshot({ path: 'test_screenshot_rotated_nobg.png' });
  await p.evaluate(() => window.__holo.toggleGhost()); console.log('seg', await p.$eval('#chkSeg', e=>e.checked)); await new Promise(r => setTimeout(r, 2000));
  await p.screenshot({ path: 'test_screenshot_ghost.png' });
  console.log('ERRORS:', JSON.stringify(errs)); await b.close();
})();
