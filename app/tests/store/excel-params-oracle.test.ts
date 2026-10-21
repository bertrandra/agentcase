import { describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { readParamsWorkbook } from '@/store/persistence/excel/params';
import { diffValues } from '../helpers/oracleDiff';
import { sameJson } from '@/store/persistence/excel/params';
import { applyTo, ENV, importTarget, legacyImported, legacyXlsx, PRISTINE, stateMismatches, xlsxIds } from '../helpers/excelParams';

const ids = xlsxIds();
/** Legacy normalisation we deliberately do not copy: none expected — keep this list empty and justify every addition. */
const IGNORE: string[] = [];

describe('legacy workbook → our reader reproduces the legacy import', () => {
  it('has fixtures', () => expect(ids.length).toBeGreaterThanOrEqual(30));
  it.each(ids)('%s', async (id) => {
    const leg = legacyImported(id), base = importTarget(leg), pristine = PRISTINE();
    const { patch, notes } = await readParamsWorkbook(legacyXlsx(id), base, ENV);
    const ours = applyTo(base, patch);
    expect(stateMismatches(ours, leg.state, pristine.state, IGNORE)).toEqual([]);
    expect(notes).toEqual(leg.notes);
    // the same keys are touched (ENVIRONMENTS aside: the legacy import drops isProd, see helpers/excelParams)
    const touched = (Object.keys(ours) as string[]).filter((k) => k !== 'ENVIRONMENTS' && !sameJson((ours as Record<string, unknown>)[k], (base as Record<string, unknown>)[k])).sort();
    const final = (k: string) => (k in leg.state ? leg.state[k] : pristine.state[k]);
    const legTouched = [...new Set([...Object.keys(leg.state), ...Object.keys(leg.base ?? {})])].filter((k) => k !== 'ENVIRONMENTS' && !sameJson(final(k), (base as Record<string, unknown>)[k])).sort();
    expect(touched).toEqual(legTouched);
    const got = computeCase(ours), problems: string[] = [];
    diffValues(leg.exp.model, JSON.parse(JSON.stringify(got.model, (_k, v) => (v === Infinity ? 'Infinity' : v))), 'model', problems);
    diffValues(leg.exp.phaseScope, got.phaseScope, 'phaseScope', problems);
    diffValues(leg.exp.glassCeiling, got.glassCeiling, 'glassCeiling', problems);
    diffValues(leg.exp.payback, got.payback, 'payback', problems);
    diffValues(leg.exp.npv, got.npv, 'npv', problems);
    expect(problems.slice(0, 10)).toEqual([]);
  });
});
