import { describe, expect, it } from 'vitest';
import { caseDiscountRate, computeCase, makeCtx, type Ctx } from '@/domain';
import { npvOf } from '@/domain/economics/cashflow';
import { hriEnabled } from '@/domain/engagement';
import { khEnabled, khSetupCost } from '@/domain/knowledge';
import { convChangeCost, lineOnMonths, programmeLines } from '@/domain/programme';
import { horizonMonthsOf } from '@/domain/programme/profile';
import { loadExtra } from '../../helpers/extras';
import { FIXTURE_IDS, loadCase } from '../../helpers/portfolio';

/**
 * SPEC_FIXES FX-73 / FX-74 (lot X0): the full-corpus parallel run (`node tools/parallel-run.mjs --corpus full`) finds the 107 case files' NPV and payback
 * moved against the legacy file, all other figures equal. This test traces every NPV move to the B9b programme profile (docs/DEVIATIONS.md
 * DEV-B9B-RESOURCES): the new NPV less the legacy one (the oracle, which the legacy file reproduces) is EXACTLY the sum, over the programme lines, of the
 * line's discounted spend under the legacy rule (its euro input, spread over months 1–6) less its discounted spend under the B9b rule. Each line's
 * share splits into an amount effect (training and governance priced from resources instead of the typed amount) and a timing effect (each line over its
 * own duration). The five large moves the nightly flagged are pinned line by line, in € thousands, as DEVIATIONS.md states them.
 */
interface Share { amount: number; timing: number }
function attribution(c: Ctx): Record<string, Share> {
  const H = horizonMonthsOf(c), rate = caseDiscountRate(c), lines = programmeLines(c, H);
  const pv = (m: number[]): number => npvOf(m, rate), six = (a: number): number[] => Array.from({ length: H }, (_, i) => (i < 6 ? a / 6 : 0));
  const legacy: Record<string, number> = { tooling: c.inp.p('setupTooling') || 0, training: c.inp.p('setupTraining') || 0,
    coaching: c.inp.p('setupCoaching') || 0, governance: c.inp.p('setupGov') || 0 };
  if (hriEnabled(c)) legacy.change = convChangeCost(c);
  if (khEnabled(c)) legacy.knowledge = khSetupCost(c);
  const out: Record<string, Share> = {};
  for (const id of new Set([...Object.keys(legacy), ...lines.map((l) => l.id)])) {
    const l = lines.find((x) => x.id === id), atLegacyTiming = pv(six(l?.amount ?? 0));
    out[id] = { amount: pv(six(legacy[id] ?? 0)) - atLegacyTiming, timing: atLegacyTiming - (l ? pv(lineOnMonths(l, H)) : 0) };
  }
  return out;
}
const total = (a: Record<string, Share>): number => Object.values(a).reduce((s, x) => s + x.amount + x.timing, 0);
const oracleNpv = (id: string): number => (loadExtra('../expected', id) as { npv: number }).npv;

describe('parallel run, full corpus: every case-file NPV move is the B9b programme profile (FX-73, FX-74)', () => {
  it.each(FIXTURE_IDS)('%s: new NPV − legacy NPV = Σ lines (legacy discounted spend − B9b discounted spend)', (id) => {
    const s = loadCase(id);
    expect((computeCase(s).npv as number) - oracleNpv(id)).toBeCloseTo(total(attribution(makeCtx(s))), 4);
  });

  // [line, amount effect, timing effect] in € thousands, rounded to 0.1; the NPV move (€k) is the legacy → new of the parallel run
  const PINNED: Record<string, { move: number; lines: [string, number, number][] }> = {
    // typed training €1,000k and governance €400k → priced from resources (€52.9k, €26.4k); tooling €2,000k over 12 months, coaching €600k over 36
    'econ-roi-low': { move: 1383.0, lines: [['tooling', 0, 38.2], ['training', 925.4, 1.0], ['coaching', 0, 54.4], ['governance', 365.0, 0.5],
      ['knowledge', 0, -1.5]] },
    'econ-roi-mid': { move: 339.1, lines: [['tooling', 0, 7.6], ['training', 241.5, 1.0], ['coaching', 0, 18.1], ['governance', 71.9, 0.5],
      ['knowledge', 0, -1.5]] },
    // all four amounts typed 0 and the hub off: training and governance are still priced from the default trainers and Design Authority
    'econ-no-setup': { move: -76.0, lines: [['tooling', 0, 0], ['training', -51.7, 1.0], ['coaching', 0, 0], ['governance', -25.8, 0.5]] },
    'setup-large': { move: 68.0, lines: [['tooling', 0, 2.3], ['training', 36.3, 1.0], ['coaching', 0, 6.3], ['governance', 23.0, 0.5],
      ['knowledge', 0, -1.5]] },
    // setup duration 6: training and governance last 6 months (€26.4k, €13.2k, below the typed €45k / €20k), the NPV rises; hub setup 60 days
    'vb-gantt-alt': { move: 26.8, lines: [['tooling', 0, 0], ['training', 18.1, 0], ['coaching', 0, 3.2], ['governance', 6.6, 0], ['knowledge', 0, -1.2]] },
  };
  const r1 = (x: number): number => Math.round(x / 100) / 10 + 0;
  it.each(Object.keys(PINNED))('%s: the large move, line by line (amount effect, timing effect)', (id) => {
    const s = loadCase(id), a = attribution(makeCtx(s)), p = PINNED[id]!;
    expect(r1((computeCase(s).npv as number) - oracleNpv(id))).toBe(p.move);
    expect(Object.entries(a).map(([l, x]) => [l, r1(x.amount), r1(x.timing)])).toEqual(p.lines);
  });
});
