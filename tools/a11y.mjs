#!/usr/bin/env node
// Accessibility audit of the BUILT single-file app (app/dist/index.html) with axe-core in Chromium.
// For each fixture it opens the case through the Open… input, switches to the Advanced persona, keeps the History dock open and visits every
// section, then audits the other states (see a11y-states.mjs: persona menu, history dock + undo toast, guided sequence, restore banner, dark /
// forced-colours / reduced-motion / 360px) and runs the keyboard-only checks (a11y-keys.mjs: Tab walk, skip link, dialogs, focus survival). Writes a report and a summary table.
// Exit code 1 when any serious/critical violation remains, or when the moderate/minor counts exceed app/a11y-budget.json.
// Usage: node tools/a11y.mjs [--fixtures golden,ctx-msi,industry-med | pf-three-products | pf-example] [--sections label,label] [--update-budget]
//        [--mode light|dark|auto] [--contrast standard|enhanced|high]   (the viewer's display preference, set in localStorage before each page loads)
//        [--report <path> | --no-write] [--shots <dir>]   (report: default test-results/a11y/report.json, git-ignored, so a local run
//        never dirties the repository; CI passes --report and uploads it; --shots: a screenshot of every state with a violation)
import { appendFileSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { app, pw, NAV, DISPLAY, recorder, openCase, openSection } from './a11y-lib.mjs';
import { historyStates, keyboardStates, mediaStates, menuToggleFocus, personaMenu, restoreBanner, wizardEnd } from './a11y-states.mjs';
const args = process.argv.slice(2), opt = (n) => (args.indexOf(n) < 0 ? '' : args[args.indexOf(n) + 1] || '').split(',').filter(Boolean);
const fixtures = opt('--fixtures').length ? opt('--fixtures') : ['golden', 'ctx-msi', 'industry-med', 'pf-example'], only = opt('--sections');
const budgetFile = resolve(app, 'a11y-budget.json'), reportArg = args.indexOf('--report') < 0 ? '' : args[args.indexOf('--report') + 1] || '';
const reportFile = args.includes('--no-write') ? '' : resolve(reportArg || resolve(app, '../test-results/a11y/report.json'));   // git-ignored: never a tracked file
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
  if (fx.startsWith('pf-')) {   // multi-product fixture: the display scope is view state (not saved), so audit the portfolio views under the Portfolio scope too (P4)
    await page.selectOption('select[aria-label="Show"]', 'portfolio');
    for (const label of labels.filter((l) => /Waves|Consolidation|Gantt|Portfolio stress|Decision/.test(l ?? '') || only.includes(l))) {   // --sections: the listed ones are audited under the Portfolio View too (aggregate view)
      if (only.length && !only.includes(label)) continue;
      if (!(await openSection(page, label))) continue;
      const expand = page.locator('button[aria-label^="Expand "]').first();   // the wave Gantt: open a wave to audit its product rows and milestones
      if (await expand.count()) await expand.click();
      const drill = page.locator('.ac-drill-head h3 button[aria-expanded=false]').first();   // aggregate view: open one product's read-only drill-down too
      if (await drill.count()) { await drill.click(); await page.waitForTimeout(500); }
      const run = page.locator('button:has-text("Run the simulation"), button:has-text("Run now")').first();   // P6: audit the portfolio stress / verdict WITH a result on screen
      if (await run.count()) { await run.click(); await page.locator('table[aria-label], table caption').first().waitFor({ timeout: 60000 }).catch(() => {}); await page.waitForTimeout(500); }
      await audit(page, fx, `${label} (scope Portfolio)`);
    }
    await page.selectOption('select[aria-label="Show"]', { index: 1 });   // back to a wave: the KPI bar of a Wave
    for (const label of only.filter((l) => labels.includes(l))) {   // --sections: and under a Wave (with a drill-down opened, if the section has one)
      if (!(await openSection(page, label))) continue;
      const drill = page.locator('.ac-drill-head h3 button[aria-expanded=false]').first();
      if (await drill.count()) { await drill.click(); await page.waitForTimeout(500); }
      await audit(page, fx, `${label} (scope Wave)`);
    }
    await audit(page, fx, '(scope Wave: KPI bar)');
  }
  if (fx.startsWith('pf-')) {   // the editing states below (Customer name) need the Product view: back to the first product
    const first = await page.locator('select[aria-label="Show"] option[value^="product:"]').first().getAttribute('value');
    await page.selectOption('select[aria-label="Show"]', first);
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
if (reportFile) mkdirSync(dirname(reportFile), { recursive: true });
if (reportFile) writeFileSync(reportFile, JSON.stringify({ audits: rec.state.audits, fixtures, ...(DISPLAY ? { display: JSON.parse(DISPLAY) } : {}), summary, violations: rows.map((r) => ({ fixture: r.fixture, section: r.section, rule: r.rule, impact: r.impact, nodes: r.nodes, example: r.targets[0] })) }, null, 1) + '\n');
console.log(`${rec.state.audits} audits (${fixtures.join(', ')})${DISPLAY ? ` display ${DISPLAY}` : ''}; report ${reportFile || 'not written'}`);
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
  const pages = [...new Set(rows.filter((r) => `${r.rule}|${r.impact}` === k).map((r) => `${r.fixture}/${r.section}`))], on = pages.slice(0, 3).join('; ') + (pages.length > 3 ? ` (+${pages.length - 3})` : '');
  if (s.impact === 'serious' || s.impact === 'critical') { fail++; console.log(`FAIL ${k}: ${s.nodes} node(s) on ${on}, e.g. ${s.example}`); }
  else if (!update && s.nodes > (budget[k] ?? 0)) { fail++; console.log(`FAIL ${k}: ${s.nodes} > budget ${budget[k] ?? 0} on ${on}`); }
}
console.log(fail ? `${fail} failing rule(s)` : 'a11y OK');
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Accessibility: ${fixtures.join(', ')}${DISPLAY ? ` (${DISPLAY})` : ''}\n\n${rec.state.audits} audits, ${fail ? `**${fail} failing rule(s)**` : 'OK'}\n\n` +
  (summary.length ? ['| Impact | Rule | Nodes | Pages | Example |', '|---|---|---|---|---|', ...summary.map((x) => `| ${x.impact} | ${x.rule} | ${x.nodes} | ${x.sections} | \`${x.example}\` |`)].join('\n') + '\n' : ''));
process.exit(fail ? 1 : 0);
