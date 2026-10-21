import { engagementCoef, engagementKey } from '../engagement';
import type { Ctx } from '../ctx';
import { MATURITY_DEFAULT } from '../catalog';
import type { Engine } from '../time';
import type { ModelResult } from '../types/model';

/** What a verify view needs from the live case: the model and the Time Engine (legacy model() + teEngineNow()). */
export interface Live { c: Ctx; m: ModelResult; eng: Engine }

export interface PeriodRow { label: string; ramp: number; human: number; agent: number; total: number; freed: number }

/** AS-IS, the two halves of Y1 and every later year: human FTE and agent vFTE from the engine's year-end adoption (legacy `per` table). */
export function periodRows({ m, eng }: Live): PeriodRow[] {
  const ys = eng.years(), base = m.base.etp, first = ys[0]?.adoptionEndPct ?? 0;
  const per: [string, number][] = [['AS-IS', 0], ['Y1 Q1-Q2', first * 0.5], ['Y1 Q3-Q4', first]];
  for (let i = 1; i < ys.length; i++) per.push([`Y${i + 1}`, (ys[i] as { adoptionEndPct: number }).adoptionEndPct]);
  return per.map(([label, ramp]) => {
    const human = base * (1 - ((ramp / 100) * m.eff) / 100), agent = base * (((ramp / 100) * m.eff) / 100);
    return { label, ramp, human, agent, total: human + agent, freed: base - human };
  });
}

export interface FteSummary { endLabel: string; total: number; agent: number; reduction: number | null; freed: number }

/** The four figures above the table, at the horizon end year. */
export function fteSummary({ m, eng }: Live): FteSummary {
  const e = eng.year(eng.horizonYears);
  return { endLabel: `Y${eng.horizonYears}`, total: e.humanFteEnd + e.agentVfteEnd, agent: e.agentVfteEnd,
    reduction: m.base.etp > 0 ? Math.round((1 - e.humanFteEnd / m.base.etp) * 100) : null, freed: m.base.etp - e.totalHumanFteEnd };
}

export interface MaturityMap { rampBounds: number[]; shareBounds: number[]; labels: string[]; auth: string[]; sup: string[] }

/** The case's L1-L4 thresholds, completed with the defaults for whatever the snapshot does not carry. */
export function maturityMap(c: Ctx): MaturityMap {
  const own = (c.s.MATURITY_MAP ?? {}) as Partial<MaturityMap>, def = MATURITY_DEFAULT as unknown as MaturityMap;
  return { rampBounds: own.rampBounds ?? def.rampBounds, shareBounds: own.shareBounds ?? def.shareBounds, labels: own.labels ?? def.labels, auth: def.auth, sup: def.sup };
}

const levelOf = (v: number, b: number[]): number => { let l = 1; for (let i = 1; i < b.length; i++) if (v >= (b[i] as number)) l = i + 1; return l; };

export interface MaturityInfo { rampY3: number; share: number; lr: number; ls: number; raw: number; capped: number; cap: number; diverge: boolean }

/** The L-level of the case: lower of the adoption reading and the agent-share reading, capped by the engagement context (legacy maturityInfo). */
export function maturityInfo({ c, m, eng }: Live): MaturityInfo {
  const n = m.ramps.length - 1;
  let rampY3 = m.ramps[n] as number, f = m.yearETP[n] as number, v = m.yearAgentVfte[n] as number;
  if (eng.horizonYears > 3) { const e = eng.year(eng.horizonYears); rampY3 = e.adoptionEndPct; f = e.humanFteEnd; v = e.agentVfteEnd; }
  const share = f + v > 0 ? (v / (f + v)) * 100 : 0, mm = maturityMap(c);
  const lr = levelOf(rampY3, mm.rampBounds), ls = levelOf(share, mm.shareBounds), raw = Math.min(lr, ls), cap = engagementCoef(c).maturityCap;
  return { rampY3, share, lr, ls, raw, capped: Math.min(raw, cap), cap, diverge: Math.abs(lr - ls) > 1 };
}

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
