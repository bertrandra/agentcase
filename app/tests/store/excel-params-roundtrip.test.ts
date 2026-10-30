import { readdirSync, readFileSync } from 'node:fs';
import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { refitPotential } from '@/store/derive';
import { legacyCase } from '@/store/persistence/bpmn/legacy';
import { paramsWorkbookBytes, readParamsWorkbook } from '@/store/persistence/excel/params';
import { IO_PARAMS } from '@/store/persistence/excel/params/sheets/parameters';
import { fromSnapshot } from '@/store/persistence/snapshot';
import type { Doc } from '@/store/types';
import { diffValues } from '../helpers/oracleDiff';
import { applyTo, ENV } from '../helpers/excelParams';
import { THEME_DEFAULT } from '@/domain/theme';

const ids = readdirSync('fixtures/cases').map((f) => f.replace('.json', '')).sort();
const figures = (d: Doc) => { const c = computeCase(d); return JSON.parse(
  JSON.stringify({ model: c.model, payback: c.payback, npv: c.npv, phaseScope: c.phaseScope, glassCeiling: c.glassCeiling },
  (_k, v) => (v === Infinity ? 'Infinity' : v))); };
/** The parameter ranges of the workbook (legacy IO_PARAMS) applied to a case: what a round trip is expected to leave of out-of-range inputs. */
const clamped = (doc: Doc): Doc => produce(doc, (d) => {
  IO_PARAMS.forEach(([id, , mn, mx, type]) => {
    const v = parseFloat(d.dom.values[id] ?? ''); if (Number.isNaN(v) || type === 'enum35' || (id === 'glassCeiling' && !d.forceGlassCeiling)) return;
    d.dom.values[id] = String(Math.max(mn, Math.min(mx, v)));
  });
});
/**
 * Keys a round trip may rewrite without changing the case: derived or re-normalised (order of sets, the legacy-faithful scope/persona rebuilds,
 * slider mirrors).
 */
const NORMALISED = ['dom', 'PERSONAS', 'SECTION_DEPS', 'SECTION_DEPS_DESC', 'sectionGroups', 'phaseOff', 'regArtefactsEdited', 'artefactsEdited',
  'selectedNorms', 'selectedRegArtefacts', 'selectedArtefacts',
  'STORIES' /* the FM Story sheet has no derived columns: the legacy import drops derivedWeight/phaseId/… too */];
const sameSet = (a: unknown, b: unknown) => JSON.stringify([...(a as string[])].sort()) === JSON.stringify([...(b as string[])].sort());

describe('our writer → our reader round-trips every fixture', () => {
  it('has the whole corpus', () => expect(ids.length).toBeGreaterThanOrEqual(100));
  it.each(ids)('%s', async (id) => {
    // a case as opened in the app: the potential fitted to the scope (the import re-fits it too)
    const doc = produce(fromSnapshot(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8'))), (d) => { refitPotential(d as Doc); });
    const { patch, notes } = await readParamsWorkbook(await paramsWorkbookBytes(doc, 'all', ENV, THEME_DEFAULT), doc, ENV);
    const back = applyTo(doc, patch), problems: string[] = [];
    diffValues(figures(clamped(doc)), figures(back), 'case', problems);
    expect(problems.slice(0, 8)).toEqual([]);
    // only the messages the legacy import shows for the same file (range clamps, the scope contradiction of a case that holds artefacts in a
    // switched-off phase)
    expect(notes.filter((n) =>
      !/^(Dependencies|S-Curve): imported|clamped (up|down) to|^S-Curve: unknown family|^Phase Scope marks|^No phase included/.test(n))).toEqual([]);
    expect(Object.keys(patch).filter((k) => !NORMALISED.includes(k))).toEqual([]);
    // (phaseOff is exempt: a phase with nothing selected is exported "No", so it joins the switched-off list — legacy behaviour, no effect on the figures)
    ['selectedNorms', 'selectedRegArtefacts', 'selectedArtefacts'].forEach((k) => {
      const b = legacyCase(back)[k], a = legacyCase(doc)[k];   // schema v3: derived from the process document
      if (!notes.some((n) => /^Phase Scope marks|^No phase included/.test(n))) expect(sameSet(a, b)).toBe(true);
    });
  });
});
