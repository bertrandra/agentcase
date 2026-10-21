#!/usr/bin/env node
// AgentCase release check — run before every commit that touches the app HTML.
//   node tools/check.mjs [AgentCase_vX_Y_EN.html] [--expect X.Y]
// Checks: (1) every inline <script> block parses, (2) the three version stamps
// agree with each other and with the file name (and --expect if given),
// (3) <div> open/close balance in the markup outside scripts.
import { readFileSync, readdirSync } from 'node:fs';
import { basename } from 'node:path';
import vm from 'node:vm';

const args = process.argv.slice(2);
const expectIdx = args.indexOf('--expect');
const expect = expectIdx >= 0 ? args.splice(expectIdx, 2)[1] : null;
const file = args[0] || readdirSync('.').filter(f => /^AgentCase_v[\d._]+_EN\.html$/.test(f)).sort().pop();
if (!file) { console.error('No AgentCase_vX_Y_EN.html found; pass the path explicitly.'); process.exit(2); }

const src = readFileSync(file, 'utf8');
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'OK  ' : 'FAIL'} ${msg}`); if (!cond) failed++; };

// 1. Parse every inline script (vendor bundles included) without executing it.
const scripts = [...src.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
scripts.forEach((m, i) => {
  const line = src.slice(0, m.index).split('\n').length;
  const label = m[1].trimStart().slice(0, 40).replace(/\s+/g, ' ');
  try { new vm.Script(m[1], { filename: `script#${i}@L${line}` }); ok(true, `script #${i} (L${line}) parses — ${label}`); }
  catch (e) { ok(false, `script #${i} (L${line}) does not parse: ${e.message}`); }
});

// 2. Version stamps.
const title = src.match(/<title>AgentCase v([\d.]+) —/)?.[1];
const footer = src.match(/<strong>AgentCase v([\d.]+)<\/strong>/)?.[1];
const arch = src.match(/AgentCaseArch'[\s\S]{0,200}?VERSION:\s*'([\d.]+)'/)?.[1];
const fromName = basename(file).match(/^AgentCase_v([\d._]+)_EN\.html$/)?.[1]?.replace(/_/g, '.');
const want = expect || fromName || title;
console.log(`     stamps: title=${title} footer=${footer} AgentCaseArch.VERSION=${arch} filename=${fromName}`);
ok(title === want, `<title> stamp is v${want}`);
ok(footer === want, `footer <strong> stamp is v${want}`);
ok(arch === `${want}.0` || arch === want, `window.AgentCaseArch.VERSION matches v${want}`);

// 3. Markup div balance (scripts stripped, since they build HTML strings).
const markup = src.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
const open = (markup.match(/<div\b/g) || []).length, close = (markup.match(/<\/div>/g) || []).length;
ok(open === close, `markup <div> balance ${open} == ${close}`);

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
