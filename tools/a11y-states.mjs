// The states beyond "every section of the Advanced persona": other personas (the persona menu), the history dock with steps and the undo toast,
// the last guided step, the autosave restore banner, the keyboard walk, emulated dark / forced-colours / reduced-motion, and a 360px reflow check.
// The app has no modal dialogs (Open… is the native picker, Save is a download), no Present mode and no dark theme: those are verified by
// the keyboard walk's dialog check (it fires if one is ever added) and by the media emulations below.
import { dialogCheck, focusSurvives, skipLink, tabWalk } from './a11y-keys.mjs';
import { axeSource, openCase, openSection } from './a11y-lib.mjs';

const settle = (page, ms = 250) => page.waitForTimeout(ms);

/** Persona menu: one audit per persona the select offers (Advanced and Builder are audited by the main walk). */
export async function personaMenu(page, fx, rec) {
  const ids = await page.evaluate(() => [...document.querySelectorAll('select[aria-label=Persona] option')].map((o) => o.value));
  for (const id of ids.filter((i) => i !== 'advanced' && i !== 'builder')) {
    await page.selectOption('select[aria-label=Persona], select[aria-label="Switch persona"]', id); await settle(page);
    await rec.audit(page, fx, `(persona menu: ${id})`);
  }
  await page.selectOption('select[aria-label=Persona], select[aria-label="Switch persona"]', 'advanced'); await settle(page);
}

/** History dock with steps, the undo toast (live region filled) and the collapsed dock. */
export async function historyStates(page, fx, rec) {
  const name = page.locator('input[aria-label="Customer name"]');
  await name.fill('Audit A'); await name.blur(); await name.fill('Audit B'); await name.blur(); await settle(page);
  await rec.audit(page, fx, '(history dock: steps listed)');
  await page.click('button[aria-label=Undo]'); await settle(page, 100);
  await rec.audit(page, fx, '(undo toast announced, redo step listed)');
  await page.click('.ac-dock > button'); await settle(page, 100);
  await rec.audit(page, fx, '(history dock collapsed)');
  await page.click('.ac-dock > button');
}

/** The last stop of the guided sequence (Finish button) and the focus checks around Start / Exit. */
export async function wizardEnd(page, fx, rec) {
  await page.selectOption('select[aria-label=Persona], select[aria-label="Switch persona"]', 'builder'); await settle(page);
  if (!(await page.locator('button:has-text("Start guided sequence")').count())) return;
  await focusSurvives(page, rec.note.bind(null, fx, '(guided sequence start)'), 'Start guided sequence (Enter)', 'button:has-text("Start guided sequence")', '.ac-wiz-active');
  const next = page.locator('.ac-wiz-active button:has-text("Next")');
  for (let i = 0; i < 300 && (await next.count()); i++) await next.click();
  await settle(page, 100);
  await rec.audit(page, fx, '(guided sequence active, last step)');
  await focusSurvives(page, rec.note.bind(null, fx, '(guided sequence finish)'), 'Finish (Enter)', '.ac-wiz-active button:has-text("Finish")', '.ac-wiz-idle');
}

/** Hide-menu mode: ☰ Menu hands focus to the sidebar. */
export async function menuToggleFocus(page, fx, rec) {
  if (!(await page.locator('.ac-gnav').count())) await page.click('button[aria-label="Toggle the sidebar menu"]');
  await settle(page, 100);
  await focusSurvives(page, rec.note.bind(null, fx, '(group bar ☰ Menu)'), '☰ Menu (Enter)', '.ac-gnav button:has-text("Menu")', '.ac-nav');
}

/** Keyboard walk of the shell on Welcome (Advanced, dock open, sidebar shown). */
export async function keyboardStates(page, fx, rec) {
  await page.selectOption('select[aria-label=Persona], select[aria-label="Switch persona"]', 'advanced'); await settle(page);
  if (await page.locator('.ac-gnav').count()) await page.click('.ac-gnav button:has-text("Menu")');
  await openSection(page, 'Welcome');
  const note = rec.note.bind(null, fx, '(keyboard walk)');
  const stops = await tabWalk(page, note);
  await skipLink(page, note);
  await dialogCheck(page, note, null);
  console.log(`keyboard walk ${fx}: ${stops} tab stops on Welcome`);
}

/** A second tab autosaved a session: the restore banner (role=alert) is offered to a freshly opened page. */
export async function restoreBanner(ctx, fx, rec) {
  const a = await openCase(ctx, fx);
  await a.locator('input[aria-label="Customer name"]').fill('Other tab'); await a.waitForTimeout(2500);
  const b = await ctx.newPage();
  await b.goto(a.url()); await b.waitForSelector('.ac-shell'); await b.addScriptTag({ content: axeSource });
  if (await b.locator('.ac-banner').count()) { await rec.audit(b, fx, '(restore banner offered)'); await tabWalk(b, rec.note.bind(null, fx, '(keyboard walk, banner)')); }
  else console.log(`note: no restore banner for ${fx}`);
  await a.close(); await b.close();
}

/** Emulated media on a few sections: dark colour scheme, forced colours, reduced motion, and a 360px viewport (reflow, no page-level horizontal scroll). */
export async function mediaStates(browser, fx, rec, labels) {
  const variants = [['dark', { colorScheme: 'dark' }], ['forced-colors', { forcedColors: 'active' }], ['reduced-motion', { reducedMotion: 'reduce' }], ['360px', { viewport: { width: 360, height: 740 } }]];
  for (const [name, o] of variants) {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, ...o }), page = await openCase(ctx, fx);
    await page.selectOption('select[aria-label=Persona]', 'advanced'); await settle(page);
    for (const label of labels) {
      if (!(await openSection(page, label))) continue;
      await rec.audit(page, fx, `(${name}) ${label}`);
      if (name === '360px' && (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1))) rec.note(fx, `(360px) ${label}`, 'reflow-horizontal-scroll', 'moderate', 'The page scrolls horizontally at 360px (WCAG 1.4.10)', 'html');
    }
    await ctx.close();
  }
}
