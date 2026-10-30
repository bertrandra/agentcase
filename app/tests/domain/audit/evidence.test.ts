import { describe, expect, it } from 'vitest';
import { makeCtx, type CaseState } from '@/domain';
import { editElementAudit, type ElementOp, type Observation } from '@/domain/audit';
import { auditEvidence, observationTier } from '@/domain/model/auditEvidence';
import { evlModel } from '@/domain/model/evidence';
import { evalDay, type EvalDate } from '@/domain/model/evidenceTiers';
import { EVIDENCE_CHECKS } from '@/domain/pdc/vars/auditEvidence';
import { NO_RUNTIME } from '@/domain/pdc/variables';
import type { XDocument } from '@/domain/process';
import { FIXTURE_IDS } from '../../helpers/portfolio';
import { adding, custom, emptied, opened, withDoc } from '../../helpers/processCases';

/**
 * D-B33 (docs/SPEC_BPMN.md § 15.7): audited observations count as evidence in the evidence ledger, for the driver they support (p ← first-pass
 * yield, rework rate; supCapacity ← FTE share). Reference case: golden, every catalogue activity out of scope, C001 (effort 7) and C002 (effort 3);
 * the ledger on, no tornado (equal weights 1/7), no declared tier (every driver ASSUMPTION 0.25, grade D). Evaluated on 2026-10-30.
 */
const NOW = evalDay(new Date(2026, 9, 30));
const golden = opened('golden');
const base = adding(emptied(golden.BPMN), custom('C001'), custom('C002', { effort: 3 }));
const high = { source: 'measurement' as const, date: '2026-09-01', confidence: 'high' as const };
const medium = { source: 'interview' as const, date: '2026-10-15', confidence: 'medium' as const };
const ob = (name: string, value: string, more: Partial<Observation> = {}): ElementOp => ({ kind: 'observation', obs: { name, value, ...more } });
const audit = (rows: [string, ElementOp][], d: XDocument = base) => rows.reduce((x, [id, op]) => editElementAudit(x, id, op), d);
const on = (d: XDocument, drivers: object = {}): CaseState => {
  const s = withDoc(golden, d);
  return { ...s, MODEL: { ...s.MODEL, FLAGS: { ...s.MODEL.FLAGS, evl: true }, EVIDENCE: { stage: 'qualification', drivers } } };
};
const ev = (d: XDocument, now: EvalDate = NOW) =>
  auditEvidence(d, now).map((a) => [a.driver, a.tier, Math.round(a.score * 1e4) / 1e4, a.activities, a.observations]);

describe('the tier of one observation (provenance of § 15.3)', () => {
  const o = (more: Partial<Observation>): Observation => ({ name: 'firstPassYield', value: '80', ...more });
  it('confidence high → MEASURED, medium → BENCHMARK, low or none → ASSUMPTION', () => {
    expect(observationTier(o(high), NOW)).toBe('MEASURED');
    expect(observationTier(o(medium), NOW)).toBe('BENCHMARK');
    expect(observationTier(o({ ...high, confidence: 'low' }), NOW)).toBe('ASSUMPTION');
    expect(observationTier(o({ source: 'measurement', date: '2026-09-01' }), NOW)).toBe('ASSUMPTION');
  });
  it('no source or no date → ASSUMPTION; an estimate or a date older than 18 months → at most BENCHMARK (undated evaluation: no age rule)', () => {
    expect(observationTier(o({ date: '2026-09-01', confidence: 'high' }), NOW)).toBe('ASSUMPTION');
    expect(observationTier(o({ source: 'measurement', confidence: 'high' }), NOW)).toBe('ASSUMPTION');
    expect(observationTier(o({ ...high, source: 'estimate' }), NOW)).toBe('BENCHMARK');
    expect(observationTier(o({ ...high, date: '2024-01-01' }), NOW)).toBe('BENCHMARK');
    expect(observationTier(o({ ...high, date: '2024-01-01' }), null)).toBe('MEASURED');
  });
});

describe('audited evidence of a driver: Σ effort × tier value / Σ effort (hand-computed)', () => {
  it('no audit data: nothing (the ledger is the declared one)', () => expect(auditEvidence(base, NOW)).toEqual([]));
  it('p: C001 MEASURED, C002 none → (7 × 1 + 3 × 0.25) / 10 = 0.775 → BENCHMARK', () => {
    expect(ev(audit([['C001', ob('firstPassYield', '80', high)]]))).toEqual([['p', 'BENCHMARK', 0.775, 1, 1]]);
  });
  it('C002 medium → (7 + 3 × 0.6) / 10 = 0.88 → BENCHMARK; C002 high → 1 → MEASURED; the strongest observation of an activity counts', () => {
    const d = audit([['C001', ob('firstPassYield', '80', high)], ['C002', ob('reworkRate', '10', medium)]]);
    expect(ev(d)).toEqual([['p', 'BENCHMARK', 0.88, 2, 2]]);
    expect(ev(audit([['C002', ob('firstPassYield', '90', high)]], d))).toEqual([['p', 'MEASURED', 1, 2, 3]]);
  });
  it('C001 low only → (7 × 0.25 + 3 × 0.25) / 10 = 0.25 → ASSUMPTION; the age rule caps an old measurement', () => {
    expect(ev(audit([['C001', ob('firstPassYield', '80', { ...high, confidence: 'low' })]]))).toEqual([['p', 'ASSUMPTION', 0.25, 1, 1]]);
    const old = audit([['C001', ob('firstPassYield', '80', { ...high, date: '2024-01-01' })], ['C002', ob('firstPassYield', '80', high)]]);
    expect(ev(old)).toEqual([['p', 'BENCHMARK', 0.72, 2, 2]]);   // (7 × 0.6 + 3 × 1) / 10
    expect(ev(old, null)).toEqual([['p', 'MEASURED', 1, 2, 2]]);
  });
  it('supCapacity ← FTE share per role; fields of no driver and out-of-scope activities count for nothing', () => {
    const d = audit([['C001', ob('fteShare', '30', { ...high, role: 'role-dev' })], ['C002', ob('fteShare', '20', { ...high, role: 'role-dev' })],
      ['C001', ob('cycleTime', '4', high)], ['A017', ob('firstPassYield', '80', high)]]);
    expect(ev(d)).toEqual([['supCapacity', 'MEASURED', 1, 2, 2]]);
  });
});

describe('the ledger counts the audited tier (grade, upgrade path, CC-EV-01)', () => {
  const both = audit([['C001', ob('firstPassYield', '80', high)], ['C002', ob('firstPassYield', '90', high)]]);
  const sup = audit([['C001', ob('fteShare', '30', { ...high, role: 'role-dev' })], ['C002', ob('fteShare', '20', { ...high, role: 'role-dev' })]], both);
  it('no audit: 7 × 0.25 / 7 = 0.25 → D; p MEASURED: (1 + 6 × 0.25) / 7 = 0.357 → D; p and supCapacity: 3.25 / 7 = 0.464 → C', () => {
    expect(evlModel(makeCtx(on(base)), null, NOW)).toMatchObject({ score: 0.25, grade: 'D' });
    const p = evlModel(makeCtx(on(both)), null, NOW);
    expect(p.score).toBeCloseTo(2.5 / 7, 12);
    expect(p.drivers.find((x) => x.id === 'p')).toMatchObject({ tier: 'ASSUMPTION', effectiveTier: 'MEASURED', audit: { tier: 'MEASURED' } });
    expect(p.upgradePriority.map((x) => x.id)).not.toContain('p');
    const two = evlModel(makeCtx(on(sup)), null, NOW);
    expect(two.score).toBeCloseTo(3.25 / 7, 12);
    expect(two.grade).toBe('C');
  });
  it('the stronger of declared and audited: a fresh declared MEASURED stays MEASURED over an audited BENCHMARK', () => {
    const d = audit([['C001', ob('firstPassYield', '80', high)]]), drv = { p: { tier: 'MEASURED', source: 'Pilot', asOf: '2026-06-01', owner: '' } };
    expect(evlModel(makeCtx(on(d, drv)), null, NOW).drivers.find((x) => x.id === 'p')?.effectiveTier).toBe('MEASURED');
    expect(evlModel(makeCtx(on(d)), null, NOW).drivers.find((x) => x.id === 'p')?.effectiveTier).toBe('BENCHMARK');
  });
  it('CC-EV-01: an audited driver has evidence', () => {
    const cc = EVIDENCE_CHECKS.find(([id]) => id === 'CC-EV-01')![1], rt = { ...NO_RUNTIME, now: NOW };
    expect(cc(makeCtx(on(base)), rt)).toContain('Acceptance rate (P1)');
    expect(cc(makeCtx(on(both)), rt)).not.toContain('Acceptance rate (P1)');
  });
});

describe('107 fixtures: no audit data, the ledger is the declared one', () => {
  it.each(FIXTURE_IDS)('%s', (id) => {
    const s = opened(id);
    expect(auditEvidence(s.BPMN, NOW)).toEqual([]);
    expect(evlModel(makeCtx(s), null, NOW).drivers.every((d) => d.audit === null)).toBe(true);
  });
});
