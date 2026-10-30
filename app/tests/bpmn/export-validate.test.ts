/**
 * BPMN B2 export (F-B2, F-B3, F-B5; spec § 11 item 3): every exported fixture validates with tools/bpmn-validate.mjs (OMG XSDs + ac: XSD +
 * BPSim 2.0 XSD + profile), and so do the in-scope-only exports and the portfolio files. The in-scope-only export keeps a consistent model.
 * The schema tests need xmllint, like samples.test.ts (skipped locally without it, always run in CI).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { resolveProduct } from '@/domain/portfolio';
import { attr, collaborationText, exportCaseText, exportDocument, isPartial, readProcess, type XElement } from '@/domain/process';
import { mapElements } from '@/domain/process/defaultProcess';
import { codes, schemaTestsRun, validate } from '../helpers/bpmnValidate';
import { FIXTURE_IDS, rawFixture } from '../helpers/bpmnRoundTrip';
import { openPortfolioFixture } from '../helpers/portfolioFixtures';

const PARTIAL = ['golden', 'artefact-edits', 'auto-cap-60', 'baseline-mixed-team'];
const all = (root: XElement): XElement[] => { const out: XElement[] = []; mapElements(root, (e) => { out.push(e); return e; }); return out; };

describe('B2 in-scope-only export (F-B3)', () => {
  it.each(PARTIAL)('%s: only in-scope activities, flows and diagram consistent, marked partial', (id) => {
    const c = rawFixture(id), full = exportDocument(c), part = exportDocument(c, { partial: true }), v = readProcess(full);
    const offPhases = new Set(v.phases.filter((p) => p.inScope === false).map((p) => p.id));
    const kept = new Set(v.activities.filter((a) => a.inScope !== false && !offPhases.has(a.phase)).map((a) => a.id));
    expect(readProcess(part).activities.map((a) => a.id)).toEqual(v.activities.filter((a) => kept.has(a.id)).map((a) => a.id));
    const els = all(part.root), ids = new Set(els.map((e) => attr(e, 'id')).filter((x) => x !== undefined));
    const refs = els.flatMap((e) => ['sourceRef', 'targetRef', 'bpmnElement', 'elementRef'].map((k) => attr(e, k)).filter((x): x is string => !!x));
    expect(refs.filter((r) => !ids.has(r))).toEqual([]);
    expect([isPartial(part), isPartial(full), readProcess(part).phases.length]).toEqual([true, false, v.phases.length]);
  });
});

describe.skipIf(!schemaTestsRun())('B2 export validates (xmllint: OMG XSDs + ac: + BPSim 2.0 + profile)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bpmn-b2-export-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const write = (name: string, text: string) => { const f = join(dir, `${name}.bpmn`); writeFileSync(f, text); return f; };
  const report = (files: string[]) => validate(files).results.map((r) => ({ file: r.file.split('/').pop(), schema: r.schema, errors: r.errors,
    warnings: r.warnings }));
  const clean = (files: string[]) => files.map((f) => ({ file: f.split('/').pop(), schema: 'valid', errors: [], warnings: [] }));

  it('every one of the 107 exported fixtures, 0 error, 0 warning', () => {
    const files = FIXTURE_IDS.map((id) => write(id, exportCaseText(rawFixture(id))));
    expect(files).toHaveLength(107);
    expect(report(files)).toEqual(clean(files));
  }, 180000);
  it('the in-scope-only exports and the portfolio files (one per product, one collaboration, in-scope collaboration)', () => {
    const pf = openPortfolioFixture('pf-three-products');
    const items = pf.products.map((p, i) => ({ code: `P${i + 1}`, name: p.name, case: resolveProduct(pf, p.id) }));
    const files = [...PARTIAL.map((id) => write(`${id}-partial`, exportCaseText(rawFixture(id), { partial: true }))),
      ...items.map((p) => write(`pf-${p.code}`, exportCaseText(p.case, { product: { code: p.code, name: p.name } }))),
      write('pf-collaboration-2', collaborationText(items.slice(0, 2))), write('pf-collaboration-partial', collaborationText(items, { partial: true }))];
    expect(report(files)).toEqual(clean(files));
    // open question for B4 / the spec: four full products in one file are about 26,000 elements, over the F-B10 limit of 20,000
    expect(items).toHaveLength(4);
    expect(validate([write('pf-collaboration-4', collaborationText(items))]).results.map(codes)).toEqual([['too-many-elements']]);
  }, 120000);
  it('the BPSim content is validated strictly by the BPSim 2.0 schema (not skipped as lax content)', () => {
    const text = exportCaseText(rawFixture('golden')), bad = text.replace('<bpsim:NumericParameter value="', '<bpsim:NumericParameter value="0.5');
    expect(bad).not.toBe(text);
    const unknown = text.replace('<bpsim:ProcessingTime>', '<bpsim:ProcessingTimes>').replace('</bpsim:ProcessingTime>', '</bpsim:ProcessingTimes>');
    expect(validate([write('bpsim-bad-type', bad), write('bpsim-unknown', unknown)]).results.map(codes)).toEqual([['schema'], ['schema']]);
  }, 60000);
});
