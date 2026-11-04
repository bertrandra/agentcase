#!/usr/bin/env node
// Real-browser check of the optional BPMN editor (docs/SPEC_BPMN.md D-B6 b, phase B6) in the BUILT single file (app/dist/index.html) under its
// Content-Security-Policy. bpmn-js is embedded gzipped (vite.config.ts `bpmnPayload`) and must not run before "Edit diagram"; opening it must raise
// no CSP violation, no page or console error; the bpmn.io watermark its licence requires must be visible and on top at its centre; open → save
// without a change writes nothing; a shape dragged on the canvas is saved as ONE undoable step (Ctrl+Z outside the canvas restores the figures and
// the document); the editor opens and closes from the keyboard and the focus comes back to "Edit diagram".
// Usage: node tools/e2e-bpmn-editor.mjs
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
process.chdir(new URL('..', import.meta.url).pathname);
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || (existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/playwright' : resolve('app/node_modules/playwright')));
const url = 'file://' + resolve('app/dist/index.html');

const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(() => {
  window.__cspViolations = [];
  document.addEventListener('securitypolicyviolation', (e) => window.__cspViolations.push(`${e.effectiveDirective} blocked ${e.blockedURI || '(inline)'}`));
});
const page = await ctx.newPage(), errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
let failures = 0, steps = 0;
async function step(name, fn) {
  steps++; errors.length = 0;
  try { await fn(); } catch (e) { failures++; console.log(`FAIL ${name}: ${e.message.split('\n')[0]}`); }
  const v = await page.evaluate(() => window.__cspViolations.splice(0));
  if (v.length) { failures++; console.log(`FAIL ${name}: CSP violation(s): ${[...new Set(v)].join(' | ')}`); }
  if (errors.length) { failures++; console.log(`FAIL ${name}: ${errors.slice(0, 2).join(' | ')}`); }
  console.log(`${name}: done`);
}
const live = () => page.locator('.ac-proc-editor .ac-proc-live').textContent();
const bpmnInPage = () => page.evaluate(() => 'BpmnJS' in window || [...document.scripts].some((s) => (s.textContent ?? '').includes('bpmn-modeler v')));
const doc = () => page.evaluate(() => document.querySelectorAll('.ac-proc-canvas .ac-bpmn-activity').length);

await page.goto(url); await page.waitForSelector('.ac-shell .ac-kpi-v');
await page.selectOption('select[aria-label=Persona]', 'advanced');
await step('Process section: bpmn-js not started before "Edit diagram"', async () => {
  const b = page.locator('nav[aria-label=Sections] button:visible').filter({ hasText: 'Process (BPMN)' }).first();
  if (!(await b.count())) {
    const heads = page.locator('nav[aria-label=Sections] button').filter({ hasText: /▼$/ });
    for (let i = 0, n = await heads.count(); i < n && !(await b.count()); i++) await heads.nth(i).click();
  }
  await b.click(); await page.waitForSelector('.ac-proc-canvas svg');
  if (await bpmnInPage()) throw new Error('bpmn-js is present before the editor is opened');
  if (await page.locator('style[data-ac-bpmn-editor]').count()) throw new Error('the editor style sheet is present before the editor is opened');
});
await step('open from the keyboard: the editor loads offline, the watermark is visible and on top', async () => {
  await page.getByRole('button', { name: 'Edit diagram' }).focus();
  await page.keyboard.press('Enter');
  await page.locator('.ac-proc-editor-canvas .djs-element[data-element-id="A017"]').waitFor({ timeout: 30000 });
  if (await page.evaluate(() => document.activeElement?.textContent) !== 'Diagram editor') throw new Error('the focus did not move to the editor');
  if (await bpmnInPage()) throw new Error('the decompressed bpmn-js script or its global was left in the page');
  const logo = page.locator('.ac-proc-editor-canvas a.bjs-powered-by');
  const box = await logo.boundingBox();
  if (!box || box.width < 20 || box.height < 10) throw new Error(`the bpmn.io watermark is not shown (${JSON.stringify(box)})`);
  await logo.scrollIntoViewIfNeeded();
  const top = await logo.evaluate((a) => {
    const r = a.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return !e || a.contains(e) ? '' : `${e.tagName}.${e.getAttribute('class') ?? ''}`;
  });
  if (top) throw new Error(`the bpmn.io watermark is covered by ${top}`);
  if (!(await logo.isVisible())) throw new Error('the bpmn.io watermark is hidden');
});
await step('open → save without a change writes nothing', async () => {
  const n = await doc();
  await page.getByRole('button', { name: 'Save to the case' }).click();
  await page.waitForFunction(() => /No change to save/.test(document.querySelector('.ac-proc-editor .ac-proc-live')?.textContent ?? ''));
  if ((await doc()) !== n) throw new Error('the diagram changed');
});
await step('move a task (select, Shift+arrows), save: one undoable step; Ctrl+Z restores', async () => {
  const shape = page.locator('.ac-proc-editor-canvas .djs-element[data-element-id="A017"] .djs-hit');
  await shape.scrollIntoViewIfNeeded();
  const b = await shape.boundingBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  await page.mouse.click(cx, cy);   // select it (the canvas takes the focus), then move it with the keyboard: Shift+arrow = 10 px
  await page.keyboard.press('Shift+ArrowRight'); await page.keyboard.press('Shift+ArrowDown');
  await page.getByRole('button', { name: 'Save to the case' }).click();
  await page.waitForFunction(() => /diagram was updated/.test(document.querySelector('.ac-proc-editor .ac-proc-live')?.textContent ?? ''), null, { timeout: 5000 })
    .catch(async () => { throw new Error(`the save did not apply: ${await live()}`); });
  await page.getByRole('button', { name: 'Save to the case' }).focus();
  await page.keyboard.press('Control+z');
  await page.locator('[aria-live]').filter({ hasText: /Undone: Edit the process diagram/ }).first().waitFor({ timeout: 5000 }).catch(() => {});
  const toast = await page.locator('[aria-live]').filter({ hasText: /Undone: Edit the process diagram/ }).count();
  if (!toast) throw new Error(`Ctrl+Z did not undo the editor's save (${await live()})`);
});
await step('zoom buttons (owner, 2026-11-03: a phone has no wheel): + enlarges, − shrinks, Fit fits', async () => {
  const scale = () => page.evaluate(() => { const v = document.querySelector('.ac-proc-editor-canvas .viewport'); return v ? new DOMMatrix(getComputedStyle(v).transform).a : 0; });
  const s0 = await scale();
  await page.getByRole('button', { name: 'Zoom in the editor' }).click();
  const s1 = await scale();
  if (!(s1 > s0)) throw new Error(`zoom in did not enlarge (${s0} -> ${s1})`);
  await page.getByRole('button', { name: 'Zoom out the editor' }).click(); await page.getByRole('button', { name: 'Zoom out the editor' }).click();
  if (!((await scale()) < s1)) throw new Error('zoom out did not shrink');
  await page.getByRole('button', { name: 'Fit the diagram in the editor' }).click();
});
await step('full screen (owner, 2026-11-03): the editor fills the window, its canvas grows and refits, the watermark stays visible', async () => {
  const canvas = page.locator('.ac-proc-editor-canvas'), before = (await canvas.boundingBox()).height;
  const toggle = page.locator('.ac-proc-editor [role=toolbar] button[aria-pressed]');   // ⤢ Full screen / ⤡ Exit full screen
  await toggle.click();
  await page.waitForFunction(() => document.querySelector('.ac-proc-editor')?.classList.contains('ac-fullscreen'));
  const vh = await page.evaluate(() => window.innerHeight), after = (await canvas.boundingBox()).height;
  if (!(after > before || after > vh * 0.6)) throw new Error(`the canvas did not grow (${before} -> ${after}, window ${vh})`);
  if (!(await page.locator('.ac-proc-editor-canvas a.bjs-powered-by').isVisible())) throw new Error('the bpmn.io watermark is hidden in full screen');
  if (!/Exit full screen: diagram editor/.test(await toggle.textContent())) throw new Error('the button does not offer to exit');
  await toggle.click();
  await page.waitForFunction(() => !document.querySelector('.ac-proc-editor')?.classList.contains('ac-fullscreen'));
});
await step('close from the keyboard: the focus comes back to "Edit diagram", the style sheet is removed', async () => {
  await page.getByRole('button', { name: /^Close/ }).focus();
  await page.keyboard.press('Enter');
  if (await page.locator('.ac-proc-editor').count()) await page.keyboard.press('Enter');   // a second press when the editor had changes
  await page.locator('.ac-proc-editor').waitFor({ state: 'detached' });
  if (await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) !== 'Edit diagram') throw new Error('the focus did not come back');
  if (await page.locator('style[data-ac-bpmn-editor]').count()) throw new Error('the editor style sheet was left in the page');
});
await step('canvas drag (owner, 2026-11-04): an activity dropped in another lane takes that lane\'s role, one step; Ctrl+Z restores it', async () => {
  const role = () => page.locator('#ac-proc-activity label', { hasText: 'Role' }).locator('select').inputValue();
  const pick = page.locator('.ac-proc-canvas g.ac-bpmn-activity rect').nth(2);
  await pick.click();
  const id = (await page.locator('#ac-proc-activity h2').textContent()).split(' · ')[0], before = await role();
  const lanes = page.locator('.ac-proc-canvas g.ac-bpmn-lane');
  let target = null;
  for (let i = 0, n = await lanes.count(); i < n && !target; i++) {
    const t = (await lanes.nth(i).locator('text').first().textContent()) ?? '';
    if (t === 'Dev' && !before.includes('dev')) target = await lanes.nth(i).locator('rect').first().boundingBox();
  }
  if (!target) throw new Error('no Dev lane to drop on');
  await page.locator('.ac-proc-diagram').first().locator('button', { hasText: 'Zoom to selection' }).click();   // zoomed in on the activity
  const pct = () => page.locator('.ac-proc-diagram').first().locator('[role=toolbar] .ac-muted').first().textContent(), zoomed = await pct();
  await pick.scrollIntoViewIfNeeded();
  const lane2 = await (async () => { for (let i = 0, n = await lanes.count(); i < n; i++) if (await lanes.nth(i).locator('text').first().textContent() === 'Dev') return lanes.nth(i).locator('rect').first().boundingBox(); return null; })();
  if (lane2) target = lane2;
  const a = await pick.boundingBox(), x = a.x + a.width / 2, y = a.y + a.height / 2;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x, y + 10, { steps: 3 }); await page.mouse.move(x, target.y + target.height / 2, { steps: 8 }); await page.mouse.up();
  await pick.click({ force: true });   // zoomed in, the label is drawn over the box
  if (!(await page.locator('#ac-proc-activity h2').textContent()).startsWith(id)) throw new Error('another activity is selected after the drop');
  if (await role() !== 'role-dev') throw new Error(`the role is ${await role()} after the drop, not role-dev (was ${before})`);
  if (await pct() !== zoomed) throw new Error(`the zoom changed after the drop (${zoomed} -> ${await pct()}): the edit must keep the view`);
  await page.locator('#ac-proc-activity h2').click();
  await page.keyboard.press('Control+z');
  await page.waitForFunction((r) => document.querySelector('#ac-proc-activity select[id$="-role"]')?.value === r, before);
});
await step('canvas links (owner, 2026-11-04): a link\'s end handle dragged onto another activity moves that end; Delete link removes it', async () => {
  const frame = page.locator('.ac-proc-diagram').first(), hits = frame.locator('.ac-bpmn-edge-hit');
  await frame.locator('select[id$="-ph"]').selectOption('L0');
  const hit = async (s, t) => { for (let i = 0, n = await hits.count(); i < n; i++) if ((await hits.nth(i).locator('title').textContent()).startsWith(`Link ${s} → ${t}:`)) return hits.nth(i); return null; };
  const first = await hit('A001', 'A002');
  if (!first) throw new Error('no link A001 → A002 drawn');
  await first.dispatchEvent('click', { clientX: 400, clientY: 300 });
  const handles = frame.locator('.ac-bpmn-handle');
  if (await handles.count() !== 2) throw new Error(`${await handles.count()} handles, not 2`);
  const h = await handles.nth(1).boundingBox();
  const target = await frame.locator('.ac-bpmn-activity').filter({ has: page.locator('title', { hasText: /^Actions on A003:/ }) }).locator('rect').first().boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2); await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 }); await page.mouse.up();
  if (!(await hit('A001', 'A003')) || (await hit('A001', 'A002'))) throw new Error('the end of the link did not move to A003');
  await (await hit('A001', 'A003')).dispatchEvent('click', { clientX: 400, clientY: 300 });
  await page.getByRole('menuitem', { name: '🗑️ Delete link' }).click();
  if (await hit('A001', 'A003')) throw new Error('the link was not deleted');
  await frame.locator('select[id$="-ph"]').selectOption('');
});
await step('sub-process (owner, 2026-11-04): created from the picked activities, an activity dropped on it joins it, its menu deletes it', async () => {
  const frame = page.locator('.ac-proc-diagram').first();
  await frame.locator('select[id$="-ph"]').selectOption('L0');
  const shape = (id) => frame.locator('.ac-bpmn-activity').filter({ has: page.locator('title', { hasText: new RegExp(`^Actions on ${id}:`) }) });
  const more = (id) => frame.locator('.ac-bpmn-more').filter({ has: page.locator('title', { hasText: new RegExp(`^Actions on ${id}:`) }) });
  await shape('A002').dispatchEvent('click');   // the page scrolls when the panel opens: events on the shapes, not at a screen point
  await shape('A003').dispatchEvent('click', { ctrlKey: true });
  await more('A002').dispatchEvent('click', { clientX: 400, clientY: 300 });
  await page.getByRole('menuitem', { name: '📦 Create a sub-process (2 activities)' }).click();
  const sub = frame.locator('.ac-bpmn-sub rect').first();
  await sub.waitFor();
  await frame.locator('.ac-proc-canvas').evaluate((el) => el.scrollIntoView({ block: 'center' }));   // clear of the sticky top bar
  const box = await sub.boundingBox(), a4 = await shape('A004').locator('rect').first().boundingBox();
  await page.mouse.move(a4.x + a4.width / 2, a4.y + a4.height / 2); await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 }); await page.mouse.up();
  await page.getByText('A004 put in Sub_1').first().waitFor({ timeout: 5000 });
  await frame.screenshot({ path: process.env.SUB_SHOT || '/dev/null' }).catch(() => {});
  await more('Sub_1').dispatchEvent('click', { clientX: 400, clientY: 300 });
  await page.getByRole('menuitem', { name: '🗑️ Delete sub-process' }).click();
  await frame.locator('.ac-bpmn-sub').waitFor({ state: 'detached' });
  await frame.locator('select[id$="-ph"]').selectOption('');
});
await browser.close();
console.log(steps, 'editor flows,', failures, 'failure(s)');
process.exit(failures ? 1 : 0);
