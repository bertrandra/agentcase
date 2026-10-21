#!/usr/bin/env node
// Extracts the code-owned catalogues of the LEGACY app (pristine, freshly booted) into app/src/domain/catalog/*.json.
// These are data, not code (decision D1). Usage: node tools/extract-catalog.mjs [legacy.html]
import { createRequire } from 'node:module';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const file = resolve(process.argv.slice(2).find(a => a.endsWith('.html')) || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop());
const out = resolve('app/src/domain/catalog'); mkdirSync(out, { recursive: true });
const browser = await pw.chromium.launch(); const page = await browser.newPage();
await page.goto('file://' + file);
await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });
const cat = await page.evaluate(() => {
  const c = o => JSON.parse(JSON.stringify(o));
  return {
    phases: c(DATA.phases), locations: c(DATA.locations), artefacts: c(DATA.artefacts), regCatalog: c(REG_CATALOG),
    engageCoef: c(ENGAGE_COEF), loopPairs: c(LOOP_PAIRS), evtClassSeed: c(EVT_CLASS_SEED), evtClassOrder: c(EVT_CLASS_ORDER),
    qualAnchor: c(QUAL_ANCHOR), statusLifecycle: c(STATUS_LIFECYCLE), tokenModels: c(TOKEN_MODELS_DEFAULT), coef: c(COEF_DEFAULT),
    maturityMap: c(MATURITY_MAP), modelDefaults: c(modelDefaults()), rate: c(RATE), teamIn: c(teamIn),
    sectionCatalog: c(SECTION_CATALOG), groups: c(GROUPS), personas: c(PERSONAS), personaSections: c(PERSONA_SECTIONS),
    sectionGroups: c(collectSnapshotState({ skipPackage: true, noClone: true }).sectionGroups),
    scalars: { ktRed: KT_RED, ccMult: CC_MULT, supRefHours: SUP_REF_HOURS_PER_PERIOD, tokOutShare: TOK_OUT_SHARE },
  };
});
// navigation / persona data belongs to the UI layer, the rest to the domain
const UI_KEYS = new Set(['sectionCatalog', 'groups', 'personas', 'personaSections', 'sectionGroups']);
const uiOut = resolve('app/src/ui/zones/data'); mkdirSync(uiOut, { recursive: true });
for (const [k, v] of Object.entries(cat)) writeFileSync(`${UI_KEYS.has(k) ? uiOut : out}/${k}.json`, JSON.stringify(v, null, 1) + '\n');
console.log(Object.keys(cat).join(' '), '->', out);
await browser.close();
