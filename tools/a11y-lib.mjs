// Shared plumbing of the accessibility audit: paths, axe injection, the audit recorder and the case-opening helper.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const app = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'app');
export const pw = createRequire(import.meta.url)(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
export const axeSource = readFileSync(createRequire(resolve(app, 'package.json')).resolve('axe-core/axe.min.js'), 'utf8');
export const NAV = 'nav[aria-label=Sections] button, .ac-gnav button';

/** The recorder: `rows` collects { fixture, section, rule, impact, nodes, help, targets }; `audit` runs axe on the page as it is; `note` records a non-axe finding. */
export function recorder() {
  const rows = [], state = { audits: 0 };
  const audit = async (page, fixture, section) => {
    const res = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((v) => ({ rule: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
    });
    state.audits++;
    for (const v of res) rows.push({ fixture, section, ...v });
  };
  const note = (fixture, section, rule, impact, help, target) => rows.push({ fixture, section, rule, impact, nodes: 1, help, targets: [target] });
  return { rows, state, audit, note };
}

/** Open the built app in a fresh page of `ctx`, load fixture `fx` through the Open… input, inject axe. */
export async function openCase(ctx, fx) {
  const page = await ctx.newPage();
  await page.goto('file://' + resolve(app, 'dist/index.html')); await page.waitForSelector('.ac-shell');
  await page.setInputFiles('input[type=file]', { name: fx + '.json', mimeType: 'application/json', buffer: readFileSync(resolve(app, `fixtures/cases/${fx}.json`)) });
  await page.addScriptTag({ content: axeSource });
  return page;
}

/** Click a navigation entry by its label (sidebar or group bar) and let the section render. */
export async function openSection(page, label) {
  const btn = page.locator(NAV).filter({ hasText: new RegExp(`^\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }).first();   // the exact label ("Compliance" is not "Risk & Compliance")
  if (!(await btn.count())) return false;
  if (!(await btn.isVisible())) { const toggle = btn.locator('xpath=ancestor::section').locator('.ac-nav-toggle'); if (await toggle.count()) await toggle.click(); }   // the sidebar groups are an accordion
  await btn.click(); await page.waitForTimeout(200);
  return true;
}
