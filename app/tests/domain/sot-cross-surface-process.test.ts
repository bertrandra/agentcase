import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { pinIndex, teamWeights } from '@/domain/baseline/teamWeights';
import { headline } from '@/domain/economics/headline';
import type { XDocument } from '@/domain/process';
import { phaseScope } from '@/domain/scope';
import { processSummary } from '@/domain/verifyA/processSummary';
import { THEME_DEFAULT } from '@/domain/theme';
import { loadExcelJS } from '@/store/persistence/excel/lazy';
import { buildResultsWorkbook, resultsData } from '@/store/persistence/excel/results';
import { reportData, renderReport } from '@/store/persistence/report';
import { adding, custom, opened, withAgent, withBoundary, withDoc, withPhase, withRole } from '../helpers/processCases';
import { fteSurfaces, moneySurfaces, setupSurfaces } from '../helpers/sotChecks';

/**
 * One source of truth extended to the B5 engine inputs (docs/SPEC_BPMN.md § 7 phase 2, § 11): cases whose process holds custom activities, roles,
 * agents, phases and rework boundary events. Every surface still prints the owner's figure, and the process outputs (results workbook Process sheet,
 * report section 7) print the engine's own rows (`processSummary`, read from the working artefacts, the selection and the team-skill resolver).
 */
const apply = (s: CaseState): CaseState => ({ ...s, dom: { ...s.dom, checked: { ...s.dom.checked, loopExternalApply: true } } });
const build = (id: string, edit: (d: XDocument) => XDocument): CaseState => { const s = opened(id); return apply(withDoc(s, edit(s.BPMN))); };
const CASES: [string, () => CaseState][] = [
  ['golden + custom activity in V3', () => build('golden', (d) => adding(d, custom('C001')))],
  ['golden + custom role and agent', () => build('golden', (d) => adding(withAgent(withRole(d, 'Prompt engineering', 'Arch/Design'), 'Translation'),
    custom('C001', { skill: 'Prompt engineering', effort: 12 }),
    custom('C002', { agentActivityType: 'Agent', capability: 'Translation', agentSup: 85, humanSup: 15 })))],
  ['golden + custom phase', () => build('golden', (d) => adding(withPhase(d, 'P9'), custom('C001', { phase: 'P9', effort: 20 })))],
  ['golden + boundary rework replacing LP001 and one of its own', () => build('golden', (d) => withBoundary(withBoundary(d,
    { id: 'BE1', container: 'Process', on: 'V4', to: 'V3', p: 0.25, share: 0.5, pair: 'LP001' }),
    { id: 'BE2', container: 'V4', on: 'A023', to: 'A023', p: 0.1, share: 0.3 }))],
  ['industry-med + custom regulatory activity', () => build('industry-med', (d) => adding(d, custom('R900', {
    regulatory: true, phase: 'V5', industry: 'MED', norm: 'ISO 13485', skill: 'ISO 13485', teamSkill: 'Regulatory Affairs', value: 'NVA-N' } as never)))],
];

describe('one source of truth on the B5 process cases', () => {
  it.each(CASES)('%s: setup, FTE and money surfaces print the owners', (_n, make) => {
    const s = make();
    setupSurfaces(s); fteSurfaces(s); moneySurfaces(s);
  });
  it.each(CASES)('%s: the figures moved (the custom content counts)', (n, make) => {
    const s = make(), base = apply(opened(n.startsWith('industry') ? 'industry-med' : 'golden'));
    expect(headline(makeCtx(s)).net).not.toBe(headline(makeCtx(base)).net);
  });
  it.each(CASES)('%s: the process summary is the engine\'s selection, weights and team skills', (_n, make) => {
    const s = make(), c = makeCtx(s), p = processSummary(c), sc = phaseScope(c.a, c.s), on = p.activities.filter((a) => a.inScope);
    expect(on.length).toBe(sc.count);
    expect(on.reduce((t, a) => t + a.w, 0)).toBeCloseTo(sc.selW, 9);
    const pins = pinIndex(s.teamIn), pool: Record<string, number> = {};
    for (const a of on.filter((x) => pins[x.id] == null)) pool[a.teamSkill] = (pool[a.teamSkill] ?? 0) + a.w;
    const tw = teamWeights(c).poolBySkill;
    expect(Object.keys(pool).sort()).toEqual(Object.keys(tw).sort());
    for (const k of Object.keys(tw)) expect(pool[k]).toBeCloseTo(tw[k] as number, 9);
  });
  it.each(CASES)('%s: the results workbook Process sheet and the report section 7 print the summary', async (_n, make) => {
    const s = make(), c = makeCtx(s), p = processSummary(c), wb = buildResultsWorkbook(await loadExcelJS(), resultsData(c), THEME_DEFAULT);
    const ws = wb.getWorksheet('Process')!, rows: unknown[][] = [];
    ws.eachRow((r) => rows.push((r.values as unknown[]).slice(1)));
    expect(rows.slice(1, p.activities.length + 1).map((r) => [r[1], r[6], r[8], r[10]])).toEqual(
      p.activities.map((a) => [a.id, a.inScope ? 'Yes' : 'No', a.teamSkill, a.effort]));
    const html = renderReport(reportData(s, new Date(0)), THEME_DEFAULT);
    expect(html).toContain('<h2>7 · Delivery process</h2>');
    const n = p.activities.filter((a) => a.inScope).length;
    expect(html).toContain(`${p.activities.length} activities (${n} in scope), of which ${p.custom.activities} custom`);
  });
  it('a catalogue case keeps the legacy outputs: no Process sheet, no section 7', async () => {
    const s = opened('golden'), c = makeCtx(s), wb = buildResultsWorkbook(await loadExcelJS(), resultsData(c), THEME_DEFAULT);
    expect(wb.worksheets.map((w) => w.name)).toEqual(['ROI', 'Investment', 'Operating costs', 'Savings', 'P&L', 'Workforce shift']);
    expect(renderReport(reportData(s, new Date(0)), THEME_DEFAULT)).not.toContain('Delivery process');
  });
});
