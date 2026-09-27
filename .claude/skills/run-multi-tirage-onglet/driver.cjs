#!/usr/bin/env node
// Driver for the Multi-Tirage-Onglet static app (index.html + css/ + scripts/).
// Serves the repo on a random local port, drives it with Playwright's Chromium, prints
// PASS/FAIL lines and exits 1 if anything failed.
//
//   node driver.cjs code                 static checks: syntax, lint, ids, assets, innerHTML
//   node driver.cjs ui                   user flows + ergonomics at 1366x768 (touch + mouse)
//   node driver.cjs devices              layout checks on 13 emulated phones/tablets/whiteboards
//   node driver.cjs shot WxH [opts]      one screenshot; opts: --tab dice --style hands|pips|digits
//                                        --count 1-6 --roll --dark --fullscreen --text130 --touch
//   node driver.cjs all                  code + ui + devices
//
// Run with NODE_PATH="$(npm root -g)" so the global playwright/eslint resolve.
// Screenshots go to $SHOTS (default /tmp/multi-tirage-shots).

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SHOTS = process.env.SHOTS || '/tmp/multi-tirage-shots';
const CHROMIUM = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  ' + detail : ''}`);
}
const slug = (s) => s.replace(/[^\w]+/g, '_');

// ---------- static server ----------

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.txt': 'text/plain' };
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

// ---------- browser helpers ----------

let browser;
async function openPage(base, opts = {}) {
  const { chromium } = require('playwright');
  browser = browser || await chromium.launch({ executablePath: CHROMIUM });
  const { text130, dark, ...ctxOpts } = opts;
  const ctx = await browser.newContext({ reducedMotion: 'reduce', colorScheme: dark ? 'dark' : 'light', ...ctxOpts });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  // The Marianne font comes from cdn.jsdelivr.net, which sandboxes often block: ignore that noise.
  page.on('console', (m) => { if (m.type() === 'error' && !/woff2|net::ERR|Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  await page.goto(base);
  await page.evaluate((t) => { localStorage.clear(); if (t) localStorage.setItem('apps1d-prefs', JSON.stringify({ text: 130 })); }, !!text130);
  await page.reload();
  page.act = (sel) => (ctxOpts.hasTouch ? page.tap(sel) : page.click(sel));
  return page;
}

async function drawName(page, names) {
  await page.fill('#nameList', names);
  await page.evaluate(() => { document.getElementById('durationRange').value = 3; });
  await page.act('#drawButton');
  await page.waitForFunction(() => !document.getElementById('drawButton').disabled, null, { timeout: 6000 });
}

async function rollDice(page, style, count) {
  await page.act('.tabButton[data-tab=dice]');
  await page.act(`.pillBtn[data-style=${style}]`);
  await page.act(`#diceCountRow .pillBtn[data-count="${count}"]`);
  await page.act('#diceRollButton');
  await page.waitForFunction(() => !document.getElementById('diceRollButton').disabled, null, { timeout: 4000 });
}

// Layout metrics measured in the page (dice tab must be visible for the dice metrics).
function measure() {
  const vw = document.documentElement.clientWidth;
  const faces = document.getElementById('diceFaces').getBoundingClientRect();
  const tiles = [...document.querySelectorAll('.dieFace')].map((t) => t.getBoundingClientRect());
  const small = [...document.querySelectorAll('button, input[type=range], textarea, label.toggle-wrap, .brand')].filter((e) => {
    const b = e.getBoundingClientRect();
    return b.width && !e.closest('[hidden]') && (b.height < 43.5 || (e.tagName === 'BUTTON' && b.width < 43.5));
  }).map((e) => `${e.id || e.className}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
  const wide = [...document.querySelectorAll('body *')].filter((e) => {
    const b = e.getBoundingClientRect();
    return b.width && (b.right > vw + 1 || b.left < -1) && !e.closest('#confettiLayer, #notifBanner');
  }).map((e) => e.id || e.className).slice(0, 4);
  return {
    hScroll: document.documentElement.scrollWidth > vw,
    wide,
    small,
    die: tiles[0] ? Math.round(tiles[0].width) : 0,
    rows: new Set(tiles.map((t) => Math.round(t.top))).size,
    outside: tiles.filter((t) => t.bottom > faces.bottom + 1 || t.right > faces.right + 1 || t.left < faces.left - 1).length,
    handsLoaded: [...document.querySelectorAll('.dieFace img')].filter((i) => i.complete && i.naturalWidth > 0).length,
  };
}

// Bottom of an element with the page scrolled to the top (is it reachable without scrolling?).
function bottomFromTop(id) {
  window.scrollTo(0, 0);
  const r = document.getElementById(id).getBoundingClientRect();
  return { bottom: Math.round(r.bottom), fits: r.bottom <= window.innerHeight };
}

// ---------- code ----------

async function code() {
  console.log('\n# code');
  const js = ['scripts/randomizer.js', 'scripts/outil.js'];
  for (const f of js) {
    try { execFileSync(process.execPath, ['--check', path.join(ROOT, f)]); report(true, `syntax ${f}`); }
    catch (e) { report(false, `syntax ${f}`, String(e.stderr)); }
  }
  try {
    execFileSync('eslint', ['-c', path.join(__dirname, 'eslint.config.mjs'), 'scripts/randomizer.js'], { cwd: ROOT, stdio: 'pipe' });
    report(true, 'eslint scripts/randomizer.js (ES5, browser globals)');
  } catch (e) {
    report(false, 'eslint scripts/randomizer.js', '\n' + String(e.stdout || e.message));
  }

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const src = fs.readFileSync(path.join(ROOT, 'scripts/randomizer.js'), 'utf8');
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const missingIds = [...src.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]).filter((id) => !ids.has(id));
  report(!missingIds.length, 'every getElementById() id exists in index.html', missingIds.join(', '));

  const refs = [...html.matchAll(/(?:href|src)="([^"#:]+)"/g)].map((m) => m[1]);
  refs.push(...[1, 2, 3, 4, 5, 6].map((n) => `assets/dice-hands/${n}.png`));
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  refs.push(...[...css.matchAll(/url\(([^)"':]+)\)/g)].map((m) => path.posix.normalize('css/' + m[1])));
  const missing = refs.filter((r) => !fs.existsSync(path.join(ROOT, r)));
  report(!missing.length, `local files referenced exist (${refs.length})`, missing.join(', '));

  // Hand images: square 600x600 (prepare-hands.cjs output) and light enough for school networks.
  const hands = [1, 2, 3, 4, 5, 6].map((n) => {
    const f = path.join(ROOT, `assets/dice-hands/${n}.png`);
    const buf = fs.readFileSync(f);
    return { n, w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), kb: Math.round(buf.length / 1024) };
  });
  const badHands = hands.filter((i) => i.w !== 600 || i.h !== 600 || i.kb > 150);
  report(!badHands.length, `hand images 600x600 and <= 150 KB (total ${hands.reduce((t, i) => t + i.kb, 0)} KB)`,
    badHands.map((i) => `${i.n}.png ${i.w}x${i.h} ${i.kb} KB`).join(', ') + (badHands.length ? ' -> run prepare-hands.cjs' : ''));

  // User text (names, file contents) must never reach innerHTML; only the known markup builders may.
  const allowed = /innerHTML = ('';|buildFaceInner\(|buildPipMarkup\(|buildHandMarkup\()/;
  const risky = src.split('\n').map((l, i) => [i + 1, l.trim()]).filter(([, l]) => /\.innerHTML\s*=/.test(l) && !allowed.test(l));
  report(!risky.length, 'innerHTML only receives internal markup', risky.map(([n, l]) => `\n      randomizer.js:${n} ${l}`).join(''));
}

// ---------- ui ----------

async function ui(base) {
  console.log('\n# ui (1366x768)');
  const page = await openPage(base, { viewport: { width: 1366, height: 768 }, hasTouch: true });

  // Names: escaped text, history, remove-drawn option.
  await page.evaluate(() => { window.pwned = false; });
  await drawName(page, '<img src=x onerror="window.pwned=true">');
  report(!(await page.evaluate(() => window.pwned)) && (await page.textContent('#resultName')).includes('<img'), 'name with HTML is shown as text, not executed');
  await page.act('#removeDrawnToggle');
  await drawName(page, 'Alice\nBilal');
  const left = (await page.inputValue('#nameList')).split('\n').filter(Boolean);
  report(left.length === 1, 'remove-drawn option removes the winner from the list', JSON.stringify(left));
  report(await page.locator('#historyList li[data-kind=names]').count() === 2, 'history records each draw');
  await page.screenshot({ path: `${SHOTS}/ui-names.png` });

  // Import a Windows-1252 file (Excel/Notepad export): accents must survive.
  const tmp = path.join(SHOTS, 'latin1.txt');
  fs.writeFileSync(tmp, Buffer.from('Chlo\xe9\nL\xe9a\n', 'latin1'));
  await page.setInputFiles('#fileImport', tmp);
  await page.waitForFunction(() => document.getElementById('nameList').value.includes('Chlo'));
  report((await page.inputValue('#nameList')).includes('Chloé'), 'import windows-1252 file keeps accents');

  // Touch then mouse on the same control must both register (interactive whiteboards).
  await page.tap('.tabButton[data-tab=dice]');
  await page.tap('#diceCountRow .pillBtn[data-count="3"]');
  await page.click('#diceCountRow .pillBtn[data-count="5"]');
  report(await page.locator('.dieFace').count() === 5, 'tap then mouse click both register');
  report((await page.textContent('.dieFace')).trim() === '?', 'dice show "?" before the first roll');

  // Each dice style rolls, lands inside the dice area, adds history.
  for (const [style, count] of [['pips', 6], ['digits', 2], ['hands', 4]]) {
    await rollDice(page, style, count);
    const m = await page.evaluate(measure);
    report(m.outside === 0 && m.die >= 90, `roll ${count} ${style} dice: all inside, readable`, `tile ${m.die}px, ${m.rows} row(s)`);
  }
  report((await page.evaluate(measure)).handsLoaded === 4, 'hand images load');
  await page.screenshot({ path: `${SHOTS}/ui-dice-hands.png` });

  // Keyboard: Space rolls when focus is not in a field; F toggles fullscreen even after a button click.
  const before = await page.locator('#historyList li[data-kind]').count();
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Space');
  await page.waitForFunction(() => !document.getElementById('diceRollButton').disabled);
  report(await page.locator('#historyList li[data-kind]').count() === before + 1, 'Space launches the active tab');
  await page.focus('#diceRollButton');
  await page.keyboard.press('f');
  report(await page.evaluate(() => !!document.fullscreenElement || document.getElementById('app').classList.contains('fakeFullscreen')), 'F enters fullscreen with a button focused');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());

  // Ergonomics at this size.
  const m = await page.evaluate(measure);
  report(!m.hScroll && !m.wide.length, 'no horizontal overflow', m.wide.join(', '));
  report(!m.small.length, 'touch targets >= 44px', m.small.join(', '));
  const btn = await page.evaluate(bottomFromTop, 'diceRollButton');
  report(btn.fits, 'dice Lancer button visible without scrolling', `bottom ${btn.bottom}px / 768`);

  // Dark theme via the reference toggle.
  await page.click('#theme-toggle');
  report(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'theme toggle switches to dark');
  // Control outlines must stay visible in dark mode: >= 3:1 against the surface behind (WCAG 1.4.11).
  const weak = await page.evaluate(() => {
    const lum = (c) => { const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const behind = (el) => { for (let e = el.parentElement; e; e = e.parentElement) { const b = getComputedStyle(e).backgroundColor; if (!/rgba\(.*, 0\)|transparent/.test(b)) return b; } return 'rgb(0,0,0)'; };
    return [...document.querySelectorAll('.pillBtn:not(.active), .icon-btn, .tabBar')].filter((e) => e.getBoundingClientRect().width).map((e) => {
      const a = lum(getComputedStyle(e).borderTopColor), b = lum(behind(e));
      return { el: e.id || e.className, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    }).filter((r) => r.ratio < 3).map((r) => `${r.el} ${r.ratio.toFixed(2)}:1`);
  });
  report(!weak.length, 'dark mode: control outlines >= 3:1 contrast', weak.join(', '));
  await page.screenshot({ path: `${SHOTS}/ui-dark.png` });

  report(!page.errors.length, 'no page errors', page.errors.join(' | '));
  await page.context().close();
}

// ---------- devices ----------

async function deviceMatrix(base) {
  const { devices } = require('playwright');
  const list = {
    'iPhone SE': devices['iPhone SE'],
    'iPhone 14': devices['iPhone 14'],
    'iPhone 14 landscape': devices['iPhone 14 landscape'],
    'Pixel 7': devices['Pixel 7'],
    'Galaxy S9+': devices['Galaxy S9+'],
    'iPad Mini': devices['iPad Mini'],
    'iPad landscape': devices['iPad (gen 7) landscape'],
    'Galaxy Tab S4': devices['Galaxy Tab S4'],
    'Whiteboard 1024x768': { viewport: { width: 1024, height: 768 }, hasTouch: true },
    'Laptop 1280x720': { viewport: { width: 1280, height: 720 } },
    'Laptop 1366x768': { viewport: { width: 1366, height: 768 } },
    'Whiteboard 1920x1080': { viewport: { width: 1920, height: 1080 }, hasTouch: true },
    'Phone text 130%': { ...devices['iPhone 14'], text130: true },
  };
  console.log('\n# devices');
  for (const [name, dev] of Object.entries(list)) {
    const page = await openPage(base, dev);
    // Phones (portrait or landscape) scroll past the settings to reach Lancer; that is accepted.
    const phone = Math.min(dev.viewport.width, dev.viewport.height) < 500;
    await drawName(page, 'Alice\nMaximilien-Alexandre de la Tour');
    const nameFits = await page.evaluate(() => {
      const c = document.getElementById('resultCard').getBoundingClientRect();
      const r = document.getElementById('resultName').getBoundingClientRect();
      return r.left >= c.left - 1 && r.right <= c.right + 1;
    });
    await rollDice(page, 'hands', 6);
    const m = await page.evaluate(measure);
    const fold = await page.evaluate(bottomFromTop, 'diceRollButton');
    const ok = nameFits && !m.hScroll && !m.wide.length && !m.outside && m.handsLoaded === 6 && !m.small.length && !page.errors.length && (phone || fold.fits);
    report(ok, `${name} (${dev.viewport.width}x${dev.viewport.height}${dev.hasTouch ? ' touch' : ''})`,
      `die ${m.die}px x${m.rows} rows | Lancer bottom ${fold.bottom}/${dev.viewport.height}px${fold.fits ? '' : phone ? ' (phone: scroll ok)' : ' BELOW FOLD'}` +
      (nameFits ? '' : ' | long name overflows') + (m.hScroll || m.wide.length ? ` | overflow ${m.wide}` : '') +
      (m.outside ? ` | ${m.outside} dice outside` : '') + (m.small.length ? ` | small ${m.small}` : '') +
      (page.errors.length ? ` | errors ${page.errors}` : ''));
    await page.screenshot({ path: `${SHOTS}/device-${slug(name)}.png` });
    await page.context().close();
  }
}

// ---------- shot ----------

async function shot(base, args) {
  const [w, h] = (args[0] || '1366x768').split('x').map(Number);
  const opt = (k) => { const i = args.indexOf('--' + k); return i === -1 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
  const page = await openPage(base, { viewport: { width: w, height: h }, dark: !!opt('dark'), text130: !!opt('text130'), hasTouch: !!opt('touch') });
  if (opt('tab') === 'dice') {
    await page.act('.tabButton[data-tab=dice]');
    await page.act(`.pillBtn[data-style=${opt('style') || 'pips'}]`);
    await page.act(`#diceCountRow .pillBtn[data-count="${opt('count') || 2}"]`);
    if (opt('roll')) { await page.act('#diceRollButton'); await page.waitForFunction(() => !document.getElementById('diceRollButton').disabled); }
  } else if (opt('roll')) {
    await drawName(page, 'Alice\nBilal\nChloé\nNoah');
  }
  if (opt('fullscreen')) {
    await page.evaluate(() => { document.getElementById('app').classList.add('fakeFullscreen'); window.dispatchEvent(new Event('resize')); });
  }
  const file = `${SHOTS}/shot-${slug(args.join('-')) || 'default'}.png`;
  await page.screenshot({ path: file, fullPage: !opt('fullscreen') });
  report(!page.errors.length, `screenshot ${file}`, page.errors.join(' | '));
}

// ---------- main ----------

(async () => {
  const [cmd = 'all', ...args] = process.argv.slice(2);
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  try {
    if (cmd === 'code' || cmd === 'all') await code();
    if (cmd === 'ui' || cmd === 'all') await ui(base);
    if (cmd === 'devices' || cmd === 'all') await deviceMatrix(base);
    if (cmd === 'shot') await shot(base, args);
    if (!['code', 'ui', 'devices', 'shot', 'all'].includes(cmd)) { console.error('usage: driver.cjs code|ui|devices|shot WxH [opts]|all'); failures++; }
  } catch (e) {
    report(false, 'driver crashed', e.stack);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
  console.log(`\n${failures ? failures + ' FAILED' : 'ALL PASSED'} — screenshots in ${SHOTS}`);
  process.exit(failures ? 1 : 0);
})();
