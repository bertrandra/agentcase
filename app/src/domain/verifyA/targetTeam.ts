/** @calc-zone delivery-views */
import { LOCATIONS, COEF_DEFAULT } from '../catalog';
import { targetMix } from '../baseline/locStrat';
import { locationMix, rateFor } from '../location';
import { activeArtefacts } from '../scope';
import type { Live } from './fteVfte';

const coef = (l: Live, k: string): number => (l.c.s.COEF?.[k] ?? COEF_DEFAULT[k]) as number;

export interface TargetTeam {
  devETP: number; supETP: number; setupETP: number; runETP: number; residualETP: number; totalRecurrent: number; avgHumanSup: number; supShare: number;
}

/** The target team at the horizon end: residual human FTE split into dev and supervision, plus the agentic run team (legacy targetTeam). */
export function targetTeam(l: Live): TargetTeam {
  const residualETP = l.eng.year(l.eng.horizonYears).humanFteEnd, act = activeArtefacts(l.c.a, l.c.s);
  const avgHumanSup = act.length ? act.reduce((s, a) => s + a.humanSup, 0) / act.length / 100 : 0.4;
  const supShare = Math.min(coef(l, 'supShareCap'), avgHumanSup * coef(l, 'supShareFactor'));
  const supETP = residualETP * supShare, runETP = l.m.runAgenticETP;
  return { devETP: residualETP - supETP, supETP, setupETP: coef(l, 'setupETP'), runETP, residualETP, totalRecurrent: residualETP + runETP, avgHumanSup,
    supShare };
}

export interface Pole { name: string; fte: number; cost: number }

/** One pole of the target team: its roles, their FTE and annual cost at the target day rate (× the AI skill premium for setup / run). */
export function poleRows(l: Live, items: [string, number][], prem = 1): Pole[] {
  const wd = l.c.inp.p('workdays');
  return items.map(([name, fte]) => ({ name, fte, cost: fte * l.m.tgtTJM * prem * wd }));
}

export interface TeamPoles { dev: Pole[]; sup: Pole[]; setup: Pole[]; run: Pole[]; setupTotal: number }

export function teamPoles(l: Live, t: TargetTeam): TeamPoles {
  const e = l.m.base.etp;
  return {
    dev: poleRows(l, [['Residual dev production', t.devETP * 0.7], ['QA/Test', t.devETP * 0.2], ['Ops/Run', t.devETP * 0.1]]),
    sup: poleRows(l, [['Agent Supervisor (output review)', t.supETP * 0.7], ['Sec/Quality', t.supETP * 0.3]]),
    setup: poleRows(l, [['Transformation lead', 0.65], ['Agentic architect', 0.75], ['Coach', 0.6]], 1.15),
    run: poleRows(l, [['AI/Agent Engineer', Math.max(0.3, e / 12)], ['Skill/Prompt Engineer', Math.max(0.2, e / 20)], ['AI-FinOps', coef(l, 'aiFinOpsFte')],
    ['AI-QA', Math.max(0.2, e / 25)]], 1.15),
    setupTotal: l.m.setupTotal,
  };
}

export interface GroupRow { group: string; composition: string; fte: number; cost: number; kind: 'Recurring' | 'Transitional';
  tone: 'dev' | 'sup' | 'run' | 'setup' }

/** The four-line summary table of the poles. */
export function groupRows(l: Live, t: TargetTeam): GroupRow[] {
  const wd = l.c.inp.p('workdays'), cost = (etp: number, prem = 1) => etp * l.m.tgtTJM * prem * wd;
  return [
    { group: 'Dev team', composition: 'Residual production (code, test, ops)', fte: t.devETP, cost: cost(t.devETP), kind: 'Recurring', tone: 'dev' },
    { group: 'Supervision', composition: 'AI output review & validation', fte: t.supETP, cost: cost(t.supETP), kind: 'Recurring', tone: 'sup' },
    { group: 'Agentic Run', composition: 'AI Eng, Prompt Eng, FinOps, AI-QA', fte: t.runETP, cost: cost(t.runETP, 1.15), kind: 'Recurring', tone: 'run' },
    { group: 'Agentic Setup', composition: 'Lead, architect, coach (transitional Y1)', fte: t.setupETP, cost: cost(t.setupETP, 1.15), kind: 'Transitional',
    tone: 'setup' },
  ];
}

/** Blended day rate of a location: the AS-IS lines staffed there, or the C1 rate when nobody is. */
export function locBlendedTJM(l: Live, loc: string): number {
  const rows = l.c.s.teamIn.filter((r) => r.loc === loc);
  if (rows.length) {
    let e = 0, c = 0;
    rows.forEach((r) => { e += r.etp; c += r.etp * rateFor(l.c.s, r.loc, r.grade); });
    return e ? c / e : rateFor(l.c.s, loc, 'C1');
  }
  return rateFor(l.c.s, loc, 'C1');
}

export interface LocRow { name: string; cls: string; asisPct: number; asisFte: number; tgtPct: number; tgtFte: number; rate: number }

/** Input vs target distribution by location: the target mix is normalised and applied to the whole target team. */
export function locRows(l: Live, t: TargetTeam): LocRow[] {
  const mx = locationMix(l.c.s), tm = targetMix(l.c.s), total = t.devETP + t.supETP + t.runETP;
  const sum = LOCATIONS.reduce((s, x) => s + (tm[x.name] || 0), 0) || 1;
  return LOCATIONS.map((x) => {
    const pc = ((tm[x.name] || 0) / sum) * 100;
    return { name: x.name, cls: x.cls, asisPct: mx.pct[x.name] ?? 0, asisFte: mx.byLoc[x.name] ?? 0, tgtPct: pc, tgtFte: (total * pc) / 100,
      rate: locBlendedTJM(l, x.name) };
  });
}
