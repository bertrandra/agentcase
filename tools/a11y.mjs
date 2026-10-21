#!/usr/bin/env node
// Accessibility audit of the BUILT single-file app (app/dist/index.html) with axe-core in Chromium.
// For each fixture it opens the case through the Open… input, switches to the Advanced persona, keeps the History dock open and visits every
// section, then audits the other states (see a11y-states.mjs: persona menu, history dock + undo toast, guided sequence, restore banner, dark /
// forced-colours / reduced-motion / 360px) and runs the keyboard-only checks (a11y-keys.mjs: Tab walk, skip link, dialogs, focus survival). Writes app/a11y-report.json and a summary table.
// Exit code 1 when any serious/critical violation remains, or when the moderate/minor counts exceed app/a11y-budget.json.
// Usage: node tools/a11y.mjs [--fixtures golden,ctx-msi,industry-med] [--sections label,label] [--update-budget]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { app, pw, NAV, recorder, openCase, openSection } from './a11y-lib.mjs';
import { historyStates, keyboardStates, mediaStates, menuToggleFocus, personaMenu, restoreBanner, wizardEnd } from './a11y-states.mjs';
const args = process.argv.slice(2), opt = (n) => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || '').split(',').filter(Boolean);
const fixtures = opt('--fixtures').length ? opt('--fixtures') : ['golden', 'ctx-msi', 'industry-med'], only = opt('--sections');
const budgetFile = resolve(app, 'a11y-budget.json'), reportFile = resolve(app, 'a11y-report.json');
const ORDER = ['critical', 'serious', 'moderate', 'minor'];

const browser = await pw.chromium.launch();
const rec = recorder(), { rows } = rec, audit = rec.audit;
const PERSONA = 'select[aria-label=Persona], select[aria-label="Switch persona"]';
for (const fx of fixtures) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await openCase(ctx, fx);
  await page.selectOption('select[aria-label=Persona]', 'advanced');
  await page.click('.ac-dock button');   // the History dock stays open for every audit
  const labels = [...new Set(await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((b) => b.textContent), NAV))];
  for (const label of labels) {
    if (only.length && !only.includes(label)) continue;
    if (await openSection(page, label)) await audit(page, fx, label);
  }
  if (!only.length) {
    await personaMenu(page, fx, rec); await historyStates(page, fx, rec);
    // the Builder persona: hide-menu mode (group bar) and a guided sequence
    await page.selectOption(PERSONA, 'builder'); await page.waitForTimeout(200);
    await audit(page, fx, '(builder: group bar + guided sequence idle)');
    const start = page.locator('button:has-text("Start guided sequence")');
    if (await start.count()) {
      await start.click(); await page.waitForTimeout(200);
      await audit(page, fx, '(guided sequence active, step 1)');
      await page.locator('.ac-wiz button:has-text("Next")').click(); await page.waitForTimeout(200);
      await audit(page, fx, '(guided sequence active, step 2)');
      await page.click('.ac-wiz button[aria-label="Exit the sequence"]');
    } else console.log(`note: no guided sequence offered for ${fx}`);
    await wizardEnd(page, fx, rec); await menuToggleFocus(page, fx, rec); await keyboardStates(page, fx, rec);
  }
  await ctx.close();
}
if (!only.length) {   // once, on the first fixture: another tab's autosave offered, and the emulated media / narrow viewport
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  await restoreBanner(ctx, fixtures[0], rec); await ctx.close();
  await mediaStates(browser, fixtures[0], rec, ['Welcome', 'Decision', 'Financial case']);
}
await browser.close();

const agg = new Map();
for (const r of rows) {
  const k = `${r.rule}|${r.impact}`, a = agg.get(k) ?? { rule: r.rule, impact: r.impact, help: r.help, nodes: 0, sections: new Set(), example: r.targets[0] };
  a.nodes += r.nodes; a.sections.add(`${r.fixture}/${r.section}`); agg.set(k, a);
}
const summary = [...agg.values()].map((a) => ({ rule: a.rule, impact: a.impact, nodes: a.nodes, sections: a.sections.size, help: a.help, example: a.example }))
  .sort((a, b) => ORDER.indexOf(a.impact) - ORDER.indexOf(b.impact) || b.nodes - a.nodes);
writeFileSync(reportFile, JSON.stringify({ audits: rec.state.audits, fixtures, summary, violations: rows.map((r) => ({ fixture: r.fixture, section: r.section, rule: r.rule, impact: r.impact, nodes: r.nodes, example: r.targets[0] })) }, null, 1) + '\n');
console.log(`${rec.state.audits} audits (${fixtures.join(', ')})`);
console.log('impact   | rule'.padEnd(42) + '| nodes | pages');
for (const s of summary) console.log(`${s.impact.padEnd(8)} | ${s.rule.padEnd(30)}| ${String(s.nodes).padStart(5)} | ${s.sections}`);
if (!summary.length) console.log('no violations');

const update = args.includes('--update-budget');
if (update) {
  const budget = Object.fromEntries(summary.filter((s) => s.impact === 'moderate' || s.impact === 'minor').map((s) => [`${s.rule}|${s.impact}`, s.nodes]));
  writeFileSync(budgetFile, JSON.stringify({ note: 'Max violating nodes per rule|impact over the audited fixtures and sections; serious/critical must stay at 0. Regenerate with `npm run a11y -- --update-budget` only to lower it.', budget }, null, 1) + '\n');
  console.log('budget written');
}
const budget = existsSync(budgetFile) ? JSON.parse(readFileSync(budgetFile, 'utf8')).budget : {};
let fail = 0;
for (const s of summary) {
  const k = `${s.rule}|${s.impact}`;
  if (s.impact === 'serious' || s.impact === 'critical') { fail++; console.log(`FAIL ${k}: ${s.nodes} node(s), e.g. ${s.example}`); }
  else if (!update && s.nodes > (budget[k] ?? 0)) { fail++; console.log(`FAIL ${k}: ${s.nodes} > budget ${budget[k] ?? 0}`); }
}
console.log(fail ? `${fail} failing rule(s)` : 'a11y OK');
process.exit(fail ? 1 : 0);
