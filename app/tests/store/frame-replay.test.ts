import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { computeCase } from '@/domain';
import { setIndustry, setRegInclude, setRegUse, toggleCross, toggleNorm } from '@/controllers/frame';
import { normsOf } from '@/domain/frame';
import { appStore } from '@/store/instance';
import { loadFixture } from '../ui/sections/frameHelpers';

const fixture = (kind: string, id: string) => JSON.parse(readFileSync(`fixtures/${kind}/${id}.json`, 'utf8'));
const ind = (code: string) => { setRegUse(true); setIndustry(code); };

// Each case replays the legacy oracle recipe (tools/oracle-recipes*) through the controllers and must land on the legacy state and result.
const CASES: Record<string, () => void> = {
  'industry-med': () => ind('MED'),
  'industry-aero': () => ind('AERO'),
  'industry-bfi': () => ind('BFI'),
  'cross-cutting': () => { setRegUse(true); toggleCross('AI', true); },   // the recipe's 'SUST' / 'USAB' codes match no norm: only AI lands
  'frame-industry-cross': () => { ind('AUTO'); toggleNorm('AUTO', normsOf('AUTO')[0]!.name, false); toggleCross('AI', true); toggleCross('USABILITY', true); setRegInclude(false); },
};

describe('frame controllers reproduce the legacy regulatory state', () => {
  it.each(Object.keys(CASES))('%s', (id) => {
    loadFixture('golden');
    CASES[id]!();
    const doc = appStore().getState().doc, exp = fixture('cases', id), expected = fixture('expected', id);
    expect(doc.regUse).toBe(exp.regUse);
    expect(doc.regInclude).toBe(exp.regInclude);
    expect(doc.selectedNorms).toEqual(exp.selectedNorms);
    expect([...doc.selectedRegArtefacts].sort()).toEqual([...exp.selectedRegArtefacts].sort());
    expect(doc.dom.values.industry).toBe(exp.dom.values.industry);
    expect(doc.dom.values.autoPotential).toBe(exp.dom.values.autoPotential);   // legacy leaves the potential alone (no re-fit on norm changes)
    const r = computeCase(doc);
    expect(r.model.ceiling).toBeCloseTo(expected.model.ceiling, 8);
    expect(r.model.eff).toBeCloseTo(expected.model.eff, 8);
    expect(r.headline.totalSavings).toBeCloseTo(expected.headline.totalSavings, 4);
  });
  it('switching industry keeps cross-cutting norms; switching the catalogue off clears industry norms only', () => {
    loadFixture('golden');
    toggleCross('AI', true); ind('MED'); ind('AUTO');
    const norms = appStore().getState().doc.selectedNorms;
    expect(norms.some((k) => k.startsWith('MED:'))).toBe(false);
    expect(norms.some((k) => k.startsWith('AUTO:'))).toBe(true);
    expect(norms.filter((k) => k.startsWith('AI:')).length).toBe(3);
    setRegUse(false);
    expect(appStore().getState().doc.selectedNorms.every((k) => k.startsWith('AI:'))).toBe(true);
  });
});
