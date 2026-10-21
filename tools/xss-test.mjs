#!/usr/bin/env node
// XSS regression test. Injects hostile strings into every user-editable field, renders every
// section and manager, then fires every inline handler that carries the payload. Any payload that
// executes pushes onto window.__xss; the test fails if anything did.
//
// Passes (each in a fresh page):
//   restore – hostile ids/labels go in through applySnapshotState() and an Excel import
//   live    – the app is restored clean, then every display-like field of the live state is poisoned
//             in place (what typing into the UI does), so output escaping is tested on its own
// Usage: node tools/xss-test.mjs [file] [--trace]    exit code 1 if anything executed
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const pw = require(process.env.PW_MODULE || '/opt/node-tools/node_modules/playwright');
const arg = process.argv.slice(2).find(a => a.endsWith('.html'));
const file = resolve(arg || readdirSync('.').filter(f => /^AgentCase_v[\d_]+_EN\.html$/.test(f)).sort().pop());
const TRACE = process.argv.includes('--trace');
const browser = await pw.chromium.launch();

async function pass(mode) {
  const page = await (await browser.newContext()).newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.addInitScript(() => {
    window.__xss = []; window.__sinks = {};
    // --trace support: record where an unescaped payload is written into the DOM (HTML line:col).
    const note = v => {
      const ix = v.indexOf('<img src=x onerror='); const ctx = v.slice(Math.max(0, ix - 90), ix).replace(/\s+/g, ' ');
      let m = (new Error().stack || '').split('\n').slice(3, 6).map(l => (l.match(/(\w+)? ?\(?[^()]*\.html:(\d+):(\d+)/) || []).slice(1).join(' ')).filter(Boolean).join(' <- ');
      const tags = [...new Set([...v.matchAll(/<img src=x onerror="window\.__xss\.push\('html:([^']*)'\)/g)].map(x => x[1]))];
      m = m.split(' <- ')[0] + '  fields=' + tags.slice(0, 6).join(',') + '  ⟦…' + ctx.slice(-50) + '⟧'; window.__sinks[m] = (window.__sinks[m] || 0) + 1;
    };
    const bad = v => typeof v === 'string' && v.includes('<img src=x onerror=');
    const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    Object.defineProperty(Element.prototype, 'innerHTML', { get: d.get, set(v) { if (bad(v)) note(v); d.set.call(this, v); } });
    const iah = Element.prototype.insertAdjacentHTML;
    Element.prototype.insertAdjacentHTML = function (p, v) { if (bad(v)) note(v); return iah.call(this, p, v); };
  });
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.classList.contains('boot-ready'), null, { timeout: 30000 });

  const result = await page.evaluate(async mode => {
    const log = [];
    // Breaks out of: HTML text, double-quoted attributes, single-quoted JS strings in inline
    // handlers, and </script>.
    const mk = tag => `"><img src=x onerror="window.__xss.push('html:${tag}')">');window.__xss.push('js:${tag}');//</script>`;
    const step = async (name, fn) => { try { await fn(); } catch (e) { log.push('step failed: ' + name + ': ' + e.message); } };
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const DISPLAY = /^(label|name|title|description|desc|skill|owner|note|notes|source|text|customer|customerName|category|role|displayName|defaultValue|comment|rationale|evidence|summary|unit|grade|loc|aiAuth|tier|status|stage|persona|group)$/;
    const SKIP_LIVE = /^(loc|grade)$/;

    // poison every display-like string under `o` (in place); returns number of fields poisoned
    const poison = (o, path, seen) => {
      let n = 0; if (!o || typeof o !== 'object' || seen.has(o)) return 0; seen.add(o);
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (typeof v === 'string' && DISPLAY.test(k) && !SKIP_LIVE.test(k) && v.length < 400) { o[k] = mk(path + '.' + k); n++; }
        else if (v && typeof v === 'object') n += poison(v, path + '.' + k, seen);
      }
      return n;
    };

    if (mode === 'restore') {
      await step('restore', async () => {
        const s = collectSnapshotState({ excludeKeys: ['namedSnapshots'] });
        s.customerName = mk('customer');
        s.teamIn[0].skill = mk('skill'); s.teamIn[0].loc = mk('loc'); s.teamIn[0].grade = mk('grade');
        const k0 = Object.keys(s.skillMap)[0]; s.skillMap[k0] = mk('skillmap');
        s.PERSONAS = s.PERSONAS.concat([
          { id: 'evilp', label: mk('personalabel'), protected: false, order: 90, seq: { on: true, steps: [{ label: mk('steplabel'), sections: ['home', 'team-in'] }] } },
          { id: mk('personaid'), label: 'IdPersona', protected: false, order: 91 }
        ]);
        s.PERSONA_SECTIONS.evilp = ['home', 'team-in', 'ratecard'];
        s.GROUPS = s.GROUPS.concat([{ id: mk('groupid'), label: mk('grouplabel'), order: 999, description: mk('groupdesc') }, { id: 'evilg', label: mk('grouplabel2'), order: 998 }]);
        s.dynamicSections = [{ id: 'dyn-evil-1', title: mk('dyntitle'), archetype: 'ALL', description: mk('dyndesc'), menuGroup: 'evilg', order: 500, visible: true, cards: [],
          rows: [{ id: mk('rowid'), seq: 0, label: mk('rowlabel'), var: null, source: 'dyn-evil-1', format: 'TEXT', defaultValue: mk('rowvalue') }] }];
        applySnapshotState(s);
      });
      await step('excel import', async () => {
        const wb = new ExcelJS.Workbook();
        const ws = (n, rows) => { const w = wb.addWorksheet(n); rows.forEach(r => w.addRow(r)); };
        ws('Parameters', [['Parameter', 'Value'], ['Customer', mk('xl-customer')]]);
        ws('Input Team', [['Skill', 'Grade', 'Location', 'FTE'], [mk('xl-skill'), 'B2', mk('xl-loc'), 2]]);
        ws('Groups', [['Id', 'Label', 'Order', 'Description', 'Color'], [mk('xl-gid'), mk('xl-glabel'), 997, mk('xl-gdesc'), '#123456']]);
        ws('Personas', [['Id', 'Label', 'Protected', 'Order'], [mk('xl-pid'), mk('xl-plabel'), false, 95]]);
        ws('Skill Map', [['Artefact skill', 'Team skill'], ['Dev', mk('xl-skillmap')]]);
        const buf = await wb.xlsx.writeBuffer();
        await importParams({ files: [{ name: 'evil' + mk('xl-file') + '.xlsx', arrayBuffer: async () => buf }] });
      });
      await step('session label', async () => { await AUTOSAVE.save(); const l = await AUTOSAVE.list(); if (l && l[0]) await AUTOSAVE.setLabel(l[0].tabId, mk('sessionlabel')); });
      await step('snapshot name', async () => { snapCreate(mk('snapname')); });
    } else if (mode === 'fuzz' || mode === 'fuzzall') {
      // export the app's own workbook, poison its string cells, import it back
      await step('fuzz import', async () => {
        let captured = null; const cu = URL.createObjectURL; URL.createObjectURL = b => { captured = b; return cu.call(URL, b); };
        await exportParams('all'); URL.createObjectURL = cu;
        if (!captured) throw new Error('export produced no blob');
        const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await captured.arrayBuffer());
        const DISPCOL = /(label|name|title|skill|desc|owner|note|text|customer|source|group|persona|role|color|colour|tag)/i;
        let cells = 0;
        wb.eachSheet(ws => {
          const hdr = []; ws.getRow(1).eachCell({ includeEmpty: true }, (c, i) => { hdr[i] = String(c.value == null ? '' : c.value); });
          ws.eachRow({ includeEmpty: false }, (row, rn) => {
            if (rn === 1) return;
            row.eachCell({ includeEmpty: false }, (c, i) => {
              if (typeof c.value !== 'string' || !c.value) return;
              if (mode === 'fuzz' && !DISPCOL.test(hdr[i] || '')) return;
              c.value = mk('x' + ws.name.replace(/\W/g, '') + '.' + (hdr[i] || i)); cells++;
            });
          });
        });
        log.push('fuzzed cells: ' + cells + ' in ' + wb.worksheets.length + ' sheets');
        const buf = await wb.xlsx.writeBuffer();
        await importParams({ files: [{ name: 'fuzz.xlsx', arrayBuffer: async () => buf }] });
      });
    } else {
      // live: poison the live state in place, plus the structures that are not in the registry
      await step('poison', async () => {
        const seen = new Set(); let n = 0;
        for (const e of STATE_REGISTRY) { if (e.key === 'dom' || e.key === 'namedSnapshots') continue; try { n += poison(e.get(), e.key, seen); } catch (x) { } }
        for (const g of [DATA.artefacts, DATA.phases, AGENT_CATALOG, LOOP_PAIRS, REG_CATALOG.norms, REG_CATALOG.artifacts, SECTION_CATALOG, TOKEN_MODELS, QUALITY, STRATEGY_DEFS]) { try { n += poison(g, 'g', seen); } catch (x) { } }
        log.push('poisoned fields: ' + n);
        // a persona/group/section with hostile ids, in place
        PERSONAS.push({ id: mk('pid'), label: mk('plabel'), protected: false, order: 90 }); PERSONA_SECTIONS.evilp = ['home'];
        GROUPS.push({ id: mk('gid'), label: mk('glabel'), order: 999, description: mk('gdesc') });
        GROUP_COLORS[mk('gid')] = mk('gcolor');
        SKILL_MAP[mk('smkey')] = mk('smval');
        teamIn.push({ pins: [mk('pin')], skill: mk('tskill'), grade: 'B2', loc: mk('tloc'), etp: 1 });
        SNAPSHOTS.push({ id: mk('sid'), name: mk('sname'), savedAt: new Date().toISOString(), state: {} });
        CUSTOMER_NAME = mk('customer'); updateAppTitle();
      });
      await step('dynamic section', async () => { dynSectionGenerate(['frame'], false); const d = DYNAMIC_SECTIONS[DYNAMIC_SECTIONS.length - 1]; d.title = mk('dyntitle'); d.description = mk('dyndesc'); d.rows.push({ id: mk('rowid'), seq: 9, label: mk('rowlabel'), var: null, source: d.id, format: 'TEXT', defaultValue: mk('rowvalue') }); d.cards.forEach(c => { Object.keys(c).forEach(k => { if (/NAME|LABEL|TITLE/.test(k)) c[k] = mk('card' + k); }); }); });
      await step('session label', async () => { await AUTOSAVE.save(); const l = await AUTOSAVE.list(); if (l && l[0]) await AUTOSAVE.setLabel(l[0].tabId, mk('sessionlabel')); });
    }
    await step('activate persona', async () => { setPersona('advanced'); });

    // render everything
    const renderers = [];
    SECTION_CATALOG.forEach(sec => renderers.push(['section:' + sec.id, () => { goTab(sec.id); if (TABRENDER[sec.id]) TABRENDER[sec.id](); }]));
    renderers.push(['personas', () => { goTab('personas'); renderPersonas(); }]);
    renderers.push(['nav', () => { renderPersonaPills(); PERSONAS.forEach(p => { try { renderPersonaNav(p.id); } catch (e) { } }); }]);
    renderers.push(['groupnav', () => { renderGroupNavBar('home'); }]);
    renderers.push(['home', () => { renderHome(); renderHomeCards(); }]);
    renderers.push(['palette', () => { openPalette(); }]);
    renderers.push(['sessions', () => { renderAutosavePanel(); }]);
    renderers.push(['snapmgr', () => { renderSnapshotManager(); }]);
    renderers.push(['wizard', () => { wizStart(); renderWizBar(); }]);
    for (const [name, fn] of renderers) { await step(name, async () => { fn(); await sleep(40); }); }
    for (const t of ['personas', 'groups', 'sections', 'assign', 'layout', 'sequence', 'deps', 'preview']) {
      await step('pmSubTab:' + t, async () => { goTab('personas'); if (typeof pmSubTab === 'function') pmSubTab(t); await sleep(40); });
    }
    for (const dsec of DYNAMIC_SECTIONS) { await step('dynsec', async () => { goTab(dsec.id); renderDynamicSectionBody(dsec.id); }); }

    // exercise the handlers that carry the payload (safe ones just pass it as a string)
    const touched = new Set();
    for (let round = 0; round < 2; round++) {
      document.querySelectorAll('*').forEach(el => {
        for (const a of el.getAttributeNames()) {
          if (!a.startsWith('on')) continue;
          const v = el.getAttribute(a) || '';
          if (!v.includes('__xss') || touched.has(el)) continue;
          touched.add(el);
          try { el.dispatchEvent(new Event(a.slice(2), { bubbles: true })); } catch (e) { }
        }
      });
      await sleep(80);
    }
    const injectedEls = [...document.querySelectorAll('*')].filter(e => ['onerror', 'onmouseover', 'onload'].some(a => (e.getAttribute(a) || '').includes('__xss')));
    return { log, xss: window.__xss.slice(), sinks: window.__sinks, injectedSample: injectedEls.slice(0, 4).map(e => (e.closest('[id]') || {}).id + ' :: ' + e.outerHTML.slice(0, 160)), injectedAttrs: injectedEls.length, handlersExercised: touched.size };
  }, mode);
  result.pageErrors = pageErrors.slice(0, 10);
  const counts = {}; result.xss.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
  result.xssByTag = counts; result.xss = Object.keys(counts);
  if (!TRACE) { delete result.sinks; delete result.injectedSample; }
  await page.close();
  return result;
}

let failed = 0;
for (const mode of ['restore', 'live', 'fuzz', 'fuzzall']) {
  const r = await pass(mode);
  console.log(`\n=== pass: ${mode} ===`);
  console.log(JSON.stringify(r, null, 2));
  if (r.xss.length || r.injectedAttrs) { failed++; console.log(`FAIL (${mode}): ${r.xss.length} distinct payload(s) executed, ${r.injectedAttrs} injected attribute(s)`); }
  else console.log(`PASS (${mode}): no payload executed`);
}
await browser.close();
process.exit(failed ? 1 : 0);
