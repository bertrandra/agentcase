import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openCaseText } from '@/controllers/openFile';
import { consolidate, validate } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { expectClose } from '../helpers/portfolio';
import { freshStore } from './helpers';

/** The example file shipped with the guide (docs/examples), opened through the real open path. Regenerate: `npx vite-node scripts/portfolio-example.ts`. */
const PATH = '../docs/examples/AgentCase_Portfolio_Example.json';

describe('docs/examples/AgentCase_Portfolio_Example.json', () => {
  const open = () => { freshStore(); openCaseText(readFileSync(PATH, 'utf8')); return appStore().getState().portfolio; };

  it('is a portfolio file that opens and validates with no error', () => {
    expect((JSON.parse(readFileSync(PATH, 'utf8')) as { _schema: string })._schema).toBe('agentcase.portfolio.v1');
    const pf = open();
    expect(validate(pf).errors).toEqual([]);
  });

  it('has the documented shape: 4 products, 2 waves, an offset, an unscheduled product, a hub, rho 0.3, overrides', () => {
    const pf = open(), by = (n: string) => pf.products.find((p) => p.name === n)!;
    expect(pf.products).toHaveLength(4);
    expect(pf.waves.map((w) => [w.name, w.startMonth, w.productIds.length])).toEqual([['Wave 1', 0, 2], ['Wave 2', 6, 1]]);
    expect(by('Payments').offsetMonths).toBe(2);
    expect(by('Archive (not scheduled)').waveId).toBeNull();
    expect(pf.hub).toEqual({ enabled: true, infraMonthly: 3000, infraAllocation: 'byBaseEtp' });
    expect(pf.rho).toBe(0.3);
    expect(pf.products.filter((p) => Object.keys(p.overrides).length > 0).length).toBeGreaterThanOrEqual(2);
    expect(new Set(pf.products.map((p) => JSON.stringify(p.knowledge))).size).toBe(4);   // a different knowledge subset per product
    expect(by('Mobile app').knowledge.ktLeadMonths).toBe(3);
  });

  it('A1-style invariants: the consolidated totals are the sum of the planned products; the unscheduled one is excluded', () => {
    const pf = open(), cons = consolidate(pf);
    expect(cons.products).toHaveLength(3);
    expect(cons.excluded).toHaveLength(1);
    const sum = (f: (v: (typeof cons.products)[number]) => number) => cons.products.reduce((a, v) => a + f(v), 0);
    expectClose(sum((v) => v.summary.npv), cons.summary.npv);
    expectClose(sum((v) => v.summary.net), cons.summary.net);
    expectClose(sum((v) => v.summary.setup), cons.summary.setup);
    expectClose(cons.waves.reduce((a, w) => a + w.summary.npv, 0), cons.summary.npv);
    expectClose(cons.series.net.reduce((a, x) => a + x, 0), cons.summary.net);
    expect(Number.isFinite(cons.summary.npv) && cons.summary.npv > 0).toBe(true);
  });
});
