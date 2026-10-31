import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { orgOf } from '@/domain/org';
import { consolidate, costModel, envelopeCase, type Portfolio } from '@/domain/portfolio';
import { programmeHistogram } from '@/domain/programme/histogram';
import { MSPDI_NS, mspdiXml } from '@/domain/programme/mspdi';
import { planViews, type PlanScope } from '@/domain/programme/planBundle';
import { THEME_DEFAULT } from '@/domain/theme';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, CASE_SHEET_NAMES, resultsData } from '@/store/persistence/excel/results';
import { PLAN_SHEET_NAMES, planSheets } from '@/store/persistence/excel/results/plan';
import { renderPlanReport } from '@/store/persistence/report/plan';
import { REPORT_CSP } from '@/store/persistence/report/render';
import { byLine, cells, nz } from '../../helpers/costModel';
import { REPO, schemaTestsRun } from '../../helpers/bpmnValidate';
import { identical } from '../../helpers/portfolio';
import { opened as loadCase } from '../../helpers/processCases';

/**
 * SPEC_BPMN § 19.8 (phase B9d): the histogram × rate is the programme's labour cost in the cost model (cross-surface), the RAM carries the
 * programme's RACI with the F-B36 checks, the OBS holds the organisation model, and the MS Project export validates against Microsoft's
 * MSPDI schema (docs/bpmn/microsoft/, hash pinned in SOURCES.md).
 */
const views = (s: CaseState, scope: PlanScope = { kind: 'product' }, pf: Portfolio = envelopeCase(s)) =>
  planViews({ c: makeCtx(s), name: pf.products[0]!.name, org: orgOf({ products: pf.products, sharedTeam: pf.sharedTeam }, s.BPMN), scope,
    k: consolidate(pf), capacity: 1 });
const OPT_ALL = { optStages: 'on', optValue: 'on', optAiAct: 'on', optAudit: 'on', optProcure: 'on', optIntegr: 'on', optHypercare: 'on', optDecom: 'on' };
const allOn = (s: CaseState): CaseState => ({ ...s, dom: { ...s.dom, values: { ...s.dom.values, ...OPT_ALL } } });

describe('cross-surface: Σ histogram × rate = the programme labour cost of the cost model', () => {
  it.each(['golden', 'ctx-msi', 'industry-med'])('%s, every opt-in activity on', (id) => {
    const s = allOn(loadCase(id)), pf = identical(s, 1), m = costModel(pf, { kind: 'portfolio' }), name = pf.products[0]!.name;
    const h = programmeHistogram(makeCtx(s)), lines = h.lines.filter((l) => l.inCost && l.id !== 'knowledge');
    expect(lines.length).toBeGreaterThan(8);
    for (const l of lines) {
      const row = byLine(m.other, name, `Setup: ${l.label}`), cost = cells(row).reduce((a: number, x) => a + nz(x), 0);
      expect(l.days.reduce((a, x) => a + x, 0) * l.rate).toBeCloseTo(cost, 4);
    }
    const pilot = h.lines.find((l) => l.id === 'pilot')!, pilotRow = byLine(m.other, name, 'Pilot (included in totals)');
    expect(pilot.days.reduce((a, x) => a + x, 0) * pilot.rate).toBeCloseTo(cells(pilotRow).reduce((a: number, x) => a + nz(x), 0), 4);
  });
});

describe('WBS, OBS and RAM of the programme', () => {
  const v = views(allOn(loadCase('golden')));
  it('the RAM: one Responsible per work package, the RACI letters of the programme, no F-B36 error', () => {
    for (const r of v.ram.rows) expect(Object.values(r.cells).flat().filter((x) => x === 'R')).toHaveLength(1);
    expect(v.ram.rows.flatMap((r) => r.findings).filter((f) => f.severity === 'error')).toEqual([]);
    expect(v.ram.columns.map((x) => x.id)).toEqual(v.lanes.map((l) => l.id));
  });
  it('the OBS: the delivery unit, its team and roles, the transformation team and the agents', () => {
    expect(v.obs.map((n) => n.kind)).toEqual(expect.arrayContaining(['organisation', 'unit', 'team', 'role', 'programmeRole', 'agent']));
    expect(v.obs.filter((n) => n.kind === 'programmeRole')).toHaveLength(7);
  });
  it('the dictionary: a named deliverable, an Accountable and dates for every work package', () => {
    for (const d of v.dictionary) { expect(d.deliverable).not.toBe(''); expect(d.accountable).not.toBe('—'); expect(d.finish >= d.start).toBe(true); }
  });
  it('the portfolio scope: waves at level 2, products at level 3, the setup capacity checked', () => {
    const s = loadCase('golden'), pv = views(s, { kind: 'portfolio' }, { ...identical(s, 3), maxConcurrentSetups: 1 });
    expect(pv.wbs.filter((n) => n.kind === 'product')).toHaveLength(3);
    expect(pv.setupFlags).toEqual([]);
    expect(pv.delivery).toBeNull();
  });
});

const XSD = join(REPO, 'docs/bpmn/microsoft/mspdi_pj12.xsd');
describe('MS Project XML (MSPDI) export', () => {
  it('Microsoft\'s schema is the file recorded in SOURCES.md (SHA-256)', () => {
    const row = /\| `mspdi_pj12\.xsd` \| (\S+) \| `([0-9a-f]{64})` \|/.exec(readFileSync(join(REPO, 'docs/bpmn/microsoft/SOURCES.md'), 'utf8'))!;
    expect(createHash('sha256').update(readFileSync(XSD)).digest('hex')).toBe(row[2]);
  });
  it('carries every work package with its WBS code, outline level and predecessors, and a resource per role with work', () => {
    const v = views(allOn(loadCase('golden'))), x = mspdiXml(v.plan, v.wbs, v.dictionary, 'Golden');
    expect(x).toContain(`<Project xmlns="${MSPDI_NS}">`);
    expect((x.match(/<Task>/g) ?? []).length).toBe(v.wbs.length);
    for (const n of v.wbs) expect(x).toContain(`<WBS>${n.code}</WBS><OutlineNumber>${n.code}</OutlineNumber><OutlineLevel>${n.level}</OutlineLevel>`);
    expect(x).toContain('<PredecessorLink>');
    expect((x.match(/<Assignment>/g) ?? []).length).toBeGreaterThan(5);
  });
  it.skipIf(!schemaTestsRun())('validates against mspdi_pj12.xsd (xmllint), single case and portfolio', () => {
    const s = allOn(loadCase('golden')), dir = mkdtempSync(join(tmpdir(), 'ac-mspdi-'));
    try {
      for (const [i, v] of [views(s), views(s, { kind: 'portfolio' }, identical(s, 2))].entries()) {
        const file = join(dir, `p${i}.xml`);
        writeFileSync(file, mspdiXml(v.plan, v.wbs, v.dictionary, 'Golden').replace(`xmlns="${MSPDI_NS}"`, `xmlns="${MSPDI_NS}/2007"`));
        const r = spawnSync('xmllint', ['--noout', '--nonet', '--schema', XSD, file], { encoding: 'utf8' });
        expect(r.stderr.trim().split('\n').filter((l) => !l.endsWith('validates')), `${i}`).toEqual([]);
        expect(r.status).toBe(0);
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('results workbook plan sheets and plan report', () => {
  const v = views(loadCase('golden'));
  it('the plan sheets follow the six case sheets; the default workbook stays the legacy one', async () => {
    const wb = buildResultsWorkbook(await loadExcelJS(), resultsData(makeCtx(loadCase('golden'))), THEME_DEFAULT);
    expect(wb.worksheets.map((w) => w.name)).toEqual([...CASE_SHEET_NAMES]);
    planSheets(wb, v);
    expect(wb.worksheets.map((w) => w.name)).toEqual([...CASE_SHEET_NAMES, ...PLAN_SHEET_NAMES]);
    expect(wb.getWorksheet('WBS')!.rowCount).toBeGreaterThan(v.wbs.length);
    expect(wb.getWorksheet('RAM')!.getRow(1).values).toContain('Design Authority');
  });
  it('the plan report: Gantt, WBS and histogram pages, scriptless, with the report policy', () => {
    const html = renderPlanReport(v, THEME_DEFAULT, 'Golden', '2026-10-31');
    for (const h of ['1 · Gantt', '2 · Work breakdown structure', '3 · Resource histogram (FTE)']) expect(html).toContain(h);
    expect(html).toContain(REPORT_CSP);
    expect(html).not.toContain('<script');
  });
});
