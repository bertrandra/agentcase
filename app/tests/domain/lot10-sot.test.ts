import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { engineNow, makeCtx, model, type CaseState } from '@/domain';
import { economicsView } from '@/domain/economics';
import { caseFte, fteAtMonth, fteBeforeAfter } from '@/domain/economics/fte';
import { headline } from '@/domain/economics/headline';
import { plannedQuarters } from '@/domain/frame';
import { automationCurve } from '@/domain/scope/automation';
import { setupBreakdown } from '@/domain/tuneB/setup';
import { resultsCore } from '@/domain/verdict/results';
import { fteSummary, periodRows, targetTeam } from '@/domain/verifyA';

/** The new rules of the lot 10 "one source of truth" deviations (docs/DEVIATIONS.md), one block each. */
const load = (id: string) => makeCtx(JSON.parse(readFileSync(`fixtures/cases/${id}.json`, 'utf8')) as CaseState);
const live = (id: string) => { const c = load(id); return { c, m: model(c), eng: engineNow(c) }; };

describe('DEV-SETUP-BREAKDOWN: one setup breakdown, read by the model', () => {
  // B9b (DEV-B9B-COACHING / -RESOURCES): training, coaching, governance from resources (hand-computed in tests/domain/programme/profile.test.ts):
  // 35,000 + 52,877 + 1,241,460 + 26,438.5 = 1,355,775.5; + the hub setup 90,000 = 1,445,775.5 (legacy: €135K and €225K).
  it('golden: the four core lines, the hub setup, and the total of the ROI', () => {
    const c = load('golden'), b = setupBreakdown(c);
    expect(b.base).toBeCloseTo(1355775.5, 6);
    expect(b.total).toBeCloseTo(1445775.5, 6);
    expect(b.total).toBe(model(c).setupTotal);
    expect(b.lines.map((l) => l.id)).toEqual(['tooling', 'training', 'coaching', 'governance', 'knowledge']);
  });
  it('hri-on lists the HRI change cost; the lines always add up to the total', () => {
    const c = load('hri-on'), b = setupBreakdown(c);
    expect(b.lines.some((l) => l.id === 'change' && l.amount === model(c).conv.changeCost && l.amount > 0)).toBe(true);
    expect(b.lines.reduce((a, l) => a + l.amount, 0)).toBeCloseTo(b.total, 9);
  });
});

describe('DEV-FTE-ONE-DEF: one human-FTE definition (delivery team + agentic run team)', () => {
  it('freed is never negative, the reduction is signed', () => {
    const up = fteBeforeAfter(10, 12), down = fteBeforeAfter(10, 4);
    expect([up.freed, down.freed]).toEqual([0, 6]);
    expect(up.reductionPct).toBeCloseTo(-20, 9);
    expect(down.reductionPct).toBeCloseTo(60, 9);
    expect(fteBeforeAfter(0, 0).reductionPct).toBe(0);
  });
  it('golden: Financial freed Y3 9.0 (legacy 11.3, the delivery team only), Results residual 6.0 (legacy 3.8)', () => {
    const c = load('golden'), f = caseFte(c);
    expect(f.freed.toFixed(1)).toBe('9.0');
    expect(economicsView(c).freed.at(-1)!.toFixed(1)).toBe('9.0');
    expect(resultsCore(c).team.human.toFixed(1)).toBe('6.0');
    expect(resultsCore(c).team.delivery.toFixed(1)).toBe('3.8');
  });
  it('the fte-vfte period rows read the Time Engine (month 6, then each year end) and the owner freed capacity', () => {
    const l = live('golden'), rows = periodRows(l), m6 = l.eng.monthAt(6), ys = l.eng.years();
    expect(rows.map((r) => r.label)).toEqual(['AS-IS', 'Y1 Q1-Q2', 'Y1 Q3-Q4', 'Y2', 'Y3']);
    expect([rows[1]!.ramp, rows[1]!.human, rows[1]!.agent]).toEqual([m6.adoptionRampPct, m6.humanFte, m6.agentVfte]);
    expect(rows[1]!.freed).toBe(fteAtMonth(l.c, 6).freed);
    rows.slice(2).forEach((r, i) => { expect(r.human).toBe(ys[i]!.humanFteEnd); expect(r.freed).toBe(Math.max(0, l.m.base.etp - ys[i]!.totalHumanFteEnd)); });
    const s = fteSummary(l);
    expect([s.reduction, s.freed]).toEqual([Math.round(caseFte(l.c).reductionPct), caseFte(l.c).freed]);
  });
  it('the engage plan frees the owner FTE at each mid-quarter month', () => {
    const c = load('golden');
    plannedQuarters(c).forEach((q, i) => expect(q.freed).toBe(Math.round(fteAtMonth(c, i * 3 + 1.5).freed * 10) / 10));
  });
});

describe('DEV-TEAM-RUN-END: the target team adds the run team of the horizon end year', () => {
  it.each(['horizon-5', 'sc-horizon-5', 'golden'])('%s', (id) => {
    const l = live(id), t = targetTeam(l), end = l.eng.year(l.eng.horizonYears);
    expect([t.runETP, t.totalRecurrent]).toEqual([end.runTeamFteEnd, end.totalHumanFteEnd]);
    expect(automationCurve(l.c).team.runETP).toBe(end.runTeamFteEnd);
  });
});

describe('DEV-RESULTS-ENGINE-SAVINGS: Results prints the Time-Engine end-year savings', () => {
  it('golden: €891,555 (legacy €1,178,868, the decomposition subtotal); the reconciling line closes the gap', () => {
    const c = load('golden'), r = resultsCore(c);
    expect(Math.round(r.last.model)).toBe(891555);
    expect(Math.round(r.last.total)).toBe(1178868);
    expect(r.last.total + r.last.other).toBeCloseTo(r.last.model, 6);
    expect(r.setup).toBe(headline(c).setup);
  });
});
