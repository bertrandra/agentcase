/** @calc-zone delivery-views */
import { engagementKey } from '../engagement';
import { maturityInfo as maturityInfoOf, type MaturityInfo } from '../tune/maturity';
import type { YearRow } from '../time/years';
import type { Ctx } from '../ctx';
import { fteBeforeAfter, humanFteOfMonth, humanFteOfYear } from '../economics/fte';
import { maturityMapOf, type MaturityMap } from '../tune/maturity';
import type { Engine } from '../time';
import type { ModelResult } from '../types/model';

/** What a verify view needs from the live case: the model and the Time Engine (legacy model() + teEngineNow()). */
export interface Live { c: Ctx; m: ModelResult; eng: Engine }

export interface PeriodRow { label: string; ramp: number; human: number; agent: number; total: number; freed: number }

/**
 * AS-IS, the two halves of Y1 and every later year, read from the Time Engine: adoption, human FTE (delivery team) and agent vFTE at the end of
 * month 6 / of each year; the freed capacity is the FTE owner's (`fteBeforeAfter`: human = delivery + agentic run team), the band's figure.
 */
export function periodRows({ m, eng }: Live): PeriodRow[] {
  const ys = eng.years(), base = m.base.etp, half = eng.monthAt(Math.min(6, eng.horizonMonths));
  const row = (label: string, ramp: number, human: number, agent: number, after: number): PeriodRow =>
    ({ label, ramp, human, agent, total: human + agent, freed: fteBeforeAfter(base, after).freed });
  const year = (label: string, y: YearRow) => row(label, y.adoptionEndPct, y.humanFteEnd, y.agentVfteEnd, humanFteOfYear(y));
  return [row('AS-IS', 0, base, 0, base), row('Y1 Q1-Q2', half.adoptionRampPct, half.humanFte, half.agentVfte, humanFteOfMonth(half)),
    ...ys.map((y, i) => year(i === 0 ? 'Y1 Q3-Q4' : `Y${i + 1}`, y))];
}

export interface FteSummary { endLabel: string; total: number; agent: number; reduction: number | null; freed: number }

/** The four figures above the table, at the horizon end year. */
/** The four figures above the table, at the horizon end year (reduction and freed capacity: the FTE owner, `fteBeforeAfter`). */
export function fteSummary({ m, eng }: Live): FteSummary {
  const e = eng.year(eng.horizonYears), f = fteBeforeAfter(m.base.etp, humanFteOfYear(e));
  return { endLabel: `Y${eng.horizonYears}`, total: e.humanFteEnd + e.agentVfteEnd, agent: e.agentVfteEnd,
    reduction: m.base.etp > 0 ? Math.round(f.reductionPct) : null, freed: f.freed };
}

export type { MaturityMap };

/** The case's L1-L4 thresholds, completed with the defaults for whatever the snapshot does not carry (the tune/maturity owner). */
export const maturityMap = (c: Ctx): MaturityMap => maturityMapOf(c.s);

export type { MaturityInfo } from '../tune/maturity';

/** The L-level of the live case (tune/maturity owns the computation; the live model and engine are the cached ones of `c`). */
export const maturityInfo = ({ c, m }: Live): MaturityInfo => maturityInfoOf(c, m);

export interface MaturityRow { label: string; ramp: string; share: string; auth: string; sup: string; current: boolean; blocked: boolean }

export function maturityRows(l: Live): { rows: MaturityRow[]; info: MaturityInfo; context: string } {
  const info = maturityInfo(l), mm = maturityMap(l.c), rb = mm.rampBounds, sb = mm.shareBounds;
  const rng = (b: number[], i: number) => (i < 3 ? `${b[i]}–${b[i + 1]}` : `≥ ${b[3]}`) + '%';
  const rows = mm.labels.map((label, i) => ({ label, ramp: rng(rb, i), share: rng(sb, i), auth: mm.auth[i] ?? '', sup: mm.sup[i] ?? '',
    current: info.capped === i + 1, blocked: i + 1 > info.cap }));
  return { rows, info, context: engagementKey(l.c) };
}

export interface FteSeries { labels: string[]; human: number[]; agent: number[]; base: number[]; max: number; marks: { lvl: string; at: number }[] }

/** Monthly human / agent curves (every 2nd month, every 3rd past 40 months) and the month each L-threshold is crossed. */
export function fteSeries({ c, m, eng }: Live): FteSeries {
  const months = m.horizon * 12, step = months > 40 ? 3 : 2, human: number[] = [], agent: number[] = [], base: number[] = [], labels: string[] = [];
  for (let mo = 0; mo <= months; mo += step) {
    const r = mo === 0 ? null : eng.monthAt(mo);
    labels.push(`M${mo}`); human.push(r ? r.humanFte : m.base.etp); agent.push(r ? r.agentVfte : 0); base.push(m.base.etp);
  }
  const marks: FteSeries['marks'] = [];
  maturityMap(c).rampBounds.forEach((th, i) => {
    for (let t = 1; t <= months; t++) if (eng.monthAt(t).adoptionRampPct >= th) { marks.push({ lvl: `L${i + 1}`, at: t / step }); break; }
  });
  return { labels, human, agent, base, max: Math.ceil(m.base.etp * 1.1), marks };
}
