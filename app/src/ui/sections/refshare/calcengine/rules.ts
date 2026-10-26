import deps from '@/generated/dependencies.json';
import { caseDiscountRate, engineNow, type Ctx } from '@/domain';
import { cumulativeOf, DEFAULT_DISCOUNT_RATE, displayedPayback, paybackMonthOf } from '@/domain/economics/cashflow';
import { headline } from '@/domain/economics/headline';
import { clampHorizonYears, HORIZON_MAX, HORIZON_MIN } from '@/domain/inputs';
import { consolidate, cutNet, portfolioHeadline, portfolioScenarios, type Portfolio } from '@/domain/portfolio';
import { isSplitComplete, SPLIT_TOLERANCE } from '@/domain/split';

/** One single-source rule of the engine: what it decides, the one module that owns it, and a fact computed live by that owner. */
export interface Rule { id: string; rule: string; owner: string; fn: string; fact: string }

/** The owner module of a figure, read from the generated dependency graph (`@owner` tags), so the page follows the code. */
export const ownerOf = (figure: string): string => deps.figures.find((f) => f.id === figure)?.owner.replace(/^src\//, '') ?? '(no owner)';

const k = (v: number) => `${Math.round(v / 1000).toLocaleString('en-US')}k`;
const same = (a: number, b: number) => (Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)) ? '= ✓' : '≠ ✗');
const pb = (m: number | null) => (m === null ? 'not reached' : m === 0 ? 'immediate' : `month ${m}`);

/** The rules with their live facts: the active case for the case rules, the portfolio for the consolidation. */
export function rules(c: Ctx, pf: Portfolio): Rule[] {
  const h = headline(c), cons = consolidate(pf), ph = portfolioHeadline(cons), dip = [-10, 15, -10, 8];
  const cut = cutNet(c, { month0: 0, lead: 0 }, engineNow(c).horizonMonths);
  const ailoc = portfolioScenarios(pf, cons.products.map((p) => p.id)).rows.find((r) => r.key === 'ailoc')?.figures.net ?? 0;
  return [
    { id: 'headline', rule: 'One money headline per case: total benefit, net (the engine total, savings minus setup), ROI, payback month and year, NPV',
      owner: ownerOf('net'), fn: 'headlineOf', fact: `this case: net ${k(h.net)}, ${pb(h.paybackMonth)}` },
    { id: 'kernel', rule: 'One cash-flow kernel: cumulative, payback month, NPV and ROI of any monthly flow (engine, Monte Carlo thin pass, portfolio)',
      owner: ownerOf('payback-month'), fn: 'cashflowSummary', fact: `NPV, ROI and payback month all owned here (${ownerOf('npv') === ownerOf('roi') ? 'one module' : 'split!'})` },
    { id: 'recovery', rule: 'Payback = the month after the LAST month with a negative cumulative; null when the final cumulative is negative',
      owner: ownerOf('payback-month'), fn: 'paybackMonthOf', fact: `flow ${dip.join(', ')} → cumulative ${cumulativeOf(dip).join(', ')} → ${pb(paybackMonthOf(cumulativeOf(dip)))}` },
    { id: 'displayed', rule: 'One displayed payback: nothing invested and money saved = "immediate" (ranked best), nothing saved = none',
      owner: ownerOf('payback-month'), fn: 'displayedPayback',
      fact: `no setup, savings > 0 → ${pb(displayedPayback(null, 0, 1))}; setup, month 14 → ${pb(displayedPayback(14, 1, 1))}` },
    { id: 'rate', rule: 'One default discount rate; the case rate (MODEL.CASE.discountRate) stays common to the portfolio',
      owner: ownerOf('npv'), fn: 'DEFAULT_DISCOUNT_RATE', fact: `default ${DEFAULT_DISCOUNT_RATE * 100} %, this case ${Math.round(caseDiscountRate(c) * 1000) / 10} %` },
    { id: 'split', rule: 'One "adds up to 100 %" rule for every split (UI, validation, file checks, Excel readers)', owner: 'domain/split.ts', fn: 'isSplitComplete',
      fact: `tolerance ${SPLIT_TOLERANCE} point: 99.6 → ${isSplitComplete(99.6) ? 'complete' : 'incomplete'}, 99.4 → ${isSplitComplete(99.4) ? 'complete' : 'incomplete'}` },
    { id: 'horizon', rule: 'One horizon reader: whole years, clamped (form text, JSON, Excel cell)', owner: 'domain/inputs.ts', fn: 'clampHorizonYears',
      fact: `${HORIZON_MIN}..${HORIZON_MAX} years: "0" → ${clampHorizonYears('0')}, "25" → ${clampHorizonYears('25')}, "" → ${clampHorizonYears('')}` },
    { id: 'consolidation', rule: 'Portfolio = each planned product\'s own engine months shifted onto the calendar and summed; no formula of its own',
      owner: ownerOf('portfolio-headline'), fn: 'consolidate',
      fact: `this portfolio: ${cons.products.length} planned, ${cons.horizon} months, net ${k(ph.net)}, ${pb(ph.paybackMonth)}` },
    { id: 'stress', rule: 'Portfolio Monte Carlo: each draw placed on the calendar and cut at the portfolio horizon exactly like the consolidation',
      owner: 'domain/portfolio/stressCut.ts', fn: 'cutNet',
      fact: `this case at month 0: cut net ${k(cut)} ${same(cut, h.net)} the engine net` },
    { id: 'scenarios', rule: 'Portfolio scenarios and sensitivity: each product rerun on its effective case, then the consolidation kernel',
      owner: 'domain/portfolio/aggScenarios.ts, aggSensitivity.ts', fn: 'portfolioScenarios, portfolioSensitivity',
      fact: `"AI + Location" net ${k(ailoc)} ${same(ailoc, ph.net)} the consolidated net` },
  ];
}
