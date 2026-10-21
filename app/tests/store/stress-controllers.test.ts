import { describe, expect, it } from 'vitest';
import { applyStrategy, runSimulation, setMcSpread, setStratSplitMode } from '@/controllers/stress';
import { setInput } from '@/controllers/inputs';
import { createAppStore } from '@/store/core';
import { setAppStore } from '@/store/instance';
import { fingerprintOf, simStore } from '@/store/simulation';
import { fromSnapshot } from '@/store/persistence/snapshot';
import type { Doc } from '@/store/types';
import { loadCase } from '../helpers/extras';

const open = (id: string) => { const s = createAppStore(fromSnapshot(loadCase(id))); setAppStore(s); return s; };
const KEYS = ['autoPotential', 'y1Ramp', 'y2Ramp', 'y3Ramp', 'glassCeiling', 'setupTooling', 'setupGov', 'setupTraining', 'setupCoaching', 'infra', 'runTeamFactor'];
const view = (d: Doc) => ({ values: Object.fromEntries(KEYS.map((k) => [k, parseFloat(d.dom.values[k] ?? '')])), fit: d.dom.checked.fitAuto, force: d.forceGlassCeiling,
  loc: d.targetLocPct, applied: (d as { stratApplied?: unknown }).stratApplied });

describe('applying a strategy writes the same case as the legacy applyStrategy()', () => {
  it('Skill center then Hybrid (the strategy-neutral base is kept: factors do not compound)', () => {
    const s = open('golden');
    applyStrategy('skill'); applyStrategy('hybrid');
    expect(view(s.getState().doc)).toEqual(view(fromSnapshot(loadCase('strat-applied-hybrid'))));
  });
  it('Agentic Organization inherits the levers', () => {
    const s = open('golden');
    applyStrategy('agentic');
    expect(view(s.getState().doc)).toEqual(view(fromSnapshot(loadCase('strat-applied-agentic'))));
  });
  it('is one undoable step', () => {
    const s = open('golden'), before = JSON.stringify(s.getState().doc);
    applyStrategy('offshore');
    expect(s.getState().history.undo).toHaveLength(1);
    s.undo();
    expect(JSON.stringify(s.getState().doc)).toBe(before);
  });
});

describe('editors', () => {
  it('a custom split is seeded from the AS-IS mix', () => {
    const s = open('golden');
    setStratSplitMode('tm', 'custom');
    const tm = (s.getState().doc as unknown as { strategyDefs: { id: string; locSplit: Record<string, number> }[] }).strategyDefs.find((x) => x.id === 'tm')!;
    expect(Object.values(tm.locSplit).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 0);
  });
  it('a spread edit is ignored when negative', () => {
    const s = open('golden');
    setMcSpread('y3Ramp', '-3');
    expect(s.getState().history.undo).toHaveLength(0);
  });
});

describe('simulation', () => {
  it('stores the run with the fingerprint of the case, and the fingerprint moves with the case', () => {
    const s = open('mc-seed-7');
    runSimulation();
    const run = simStore.getState().run!;
    expect(run.seed).toBe(7);
    expect(run.n).toBe(300);
    expect(run.fingerprint).toBe(fingerprintOf(s.getState().doc));
    setInput('y1Ramp', 30);
    expect(fingerprintOf(s.getState().doc)).not.toBe(run.fingerprint);
  });
});
