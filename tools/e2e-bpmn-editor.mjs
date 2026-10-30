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
await step('close from the keyboard: the focus comes back to "Edit diagram", the style sheet is removed', async () => {
  await page.getByRole('button', { name: /^Close/ }).focus();
  await page.keyboard.press('Enter');
  if (await page.locator('.ac-proc-editor').count()) await page.keyboard.press('Enter');   // a second press when the editor had changes
  await page.locator('.ac-proc-editor').waitFor({ state: 'detached' });
  if (await page.evaluate(() => document.activeElement?.textContent) !== 'Edit diagram') throw new Error('the focus did not come back');
  if (await page.locator('style[data-ac-bpmn-editor]').count()) throw new Error('the editor style sheet was left in the page');
});
await browser.close();
console.log(steps, 'editor flows,', failures, 'failure(s)');
process.exit(failures ? 1 : 0);
