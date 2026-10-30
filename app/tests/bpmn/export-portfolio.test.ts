// @vitest-environment jsdom
/**
 * BPMN B2 export of portfolios (F-B5, D-B8: one file per product, or one collaboration file with one pool per product) and the controller of the
 * File menu entry (F-B1 file names, F-B3 in-scope option). Round trip on every product of the sample portfolios (spec § 11.2).
 */
import { describe, expect, it } from 'vitest';
import { bpmnExportChoices, bpmnFilename, exportProcessFiles, parseBpmnFile } from '@/controllers/bpmn';
import { resolveProduct, type Portfolio } from '@/domain/portfolio';
import { attr, collaborationText, exportCaseText, kid, kids, NS, readProcess, type XElement } from '@/domain/process';
import { activeDoc } from '@/store/editBase';
import { freshStore } from '../store/helpers';
import { expectRoundTrip, parsed, v2Keys } from '../helpers/bpmnRoundTrip';
import { fourProducts, openPortfolioFixture, regulatedPortfolio } from '../helpers/portfolioFixtures';

const NOW = new Date('2026-10-30T12:00:00Z');
const inputs = (pf: Portfolio) => pf.products.filter((p) => !p.archived).map((p, i) => ({ code: `P${i + 1}`, name: p.name, case: resolveProduct(pf, p.id) }));
const ids = (e: XElement, out: string[] = []): string[] => {
  const id = attr(e, 'id');
  if (id !== undefined) out.push(id);
  for (const c of kids(e)) ids(c, out);
  return out;
};

describe.each([
  ['pf-three-products', () => openPortfolioFixture('pf-three-products')],
  ['four products with overrides of every kind', fourProducts],
  ['regulated portfolio', () => regulatedPortfolio()],
])('B2 portfolio export: %s', (_, open) => {
  it('one file per product: each round-trips byte-identically and gives back the product\'s v2 keys', () => {
    const pf = open();
    for (const p of inputs(pf)) expectRoundTrip(exportCaseText(p.case, { product: { code: p.code, name: p.name } }), v2Keys(p.case));
    const files = exportProcessFiles('perProduct', false, NOW);
    expect(files.map((f) => f.filename)).toEqual(inputs(pf).map((p) => bpmnFilename(activeDoc().customerName as string | undefined, p.name, NOW)));
  }, 60000);
  it('one collaboration file: one pool per product, unique ids, ac:product on each process, round trip', () => {
    const pf = open(), items = inputs(pf), text = collaborationText(items), d = expectRoundTrip(text), defs = d.root;
    const parts = kids(kid(defs, NS.bpmn, 'collaboration') as XElement, NS.bpmn, 'participant');
    expect(parts.map((p) => [attr(p, 'name'), attr(p, 'processRef')])).toEqual(items.map((p) => [p.name, `${p.code}_Process`]));
    const procs = kids(defs, NS.bpmn, 'process');
    const product = (p: XElement) => kid(kid(p, NS.bpmn, 'extensionElements') as XElement, NS.ac, 'product') as XElement;
    expect(procs.map((p) => attr(product(p), 'code'))).toEqual(items.map((p) => p.code));
    const all = ids(defs);
    expect(new Set(all).size).toBe(all.length);
    expect(exportProcessFiles('collaboration', false, NOW).map((f) => f.text === text)).toEqual([true]);
  }, 60000);
});

describe('B2 export controller (File menu)', () => {
  it('a single case: one file named after the customer and the date, the in-scope option marks it partial', () => {
    freshStore();
    expect(bpmnExportChoices().portfolio).toBe(false);
    const [full] = exportProcessFiles('collaboration', false, NOW), [part] = exportProcessFiles('shown', true, NOW);
    expect(full?.filename).toMatch(/^AgentCase_process_\w+_2026-10-30\.bpmn$/);
    expect(parsed(full?.text ?? '').root.attrs.some((a) => a.name === 'ac:partial')).toBe(false);
    expect(attr(parsed(part?.text ?? '').root, 'ac:partial')).toBe('true');
    expect(readProcess(parsed(part?.text ?? '')).activities.every((a) => a.inScope !== false)).toBe(true);
  });
  it('file names keep only safe characters', () => {
    expect(bpmnFilename(' ACME / Corp ', 'Pay roll*', NOW)).toBe('AgentCase_process_ACME_Corp_Pay_roll_2026-10-30.bpmn');
    expect(bpmnFilename(undefined, undefined, NOW)).toBe('AgentCase_process_case_2026-10-30.bpmn');
  });
  it('parseBpmnFile returns the tree and the diagnostics, refuses an oversized file without reading it, writes nothing', async () => {
    freshStore();
    const [f] = exportProcessFiles('shown', false, NOW), text = f?.text ?? '';
    const ok = await parseBpmnFile({ size: text.length, text: () => Promise.resolve(text) });
    expect(ok.errors).toEqual([]);
    expect(ok.doc?.root.local).toBe('definitions');
    let read = false;
    const big = await parseBpmnFile({ size: 6 * 1024 * 1024, text: () => { read = true; return Promise.resolve(''); } });
    expect([big.doc, big.errors.map((e) => e.code), read]).toEqual([null, ['too-large'], false]);
    const notBpmn = await parseBpmnFile({ size: 10, text: () => Promise.resolve('<a/>') });
    expect(notBpmn.errors.map((e) => e.code)).toEqual(['not-bpmn']);
  });
});
