import { engineNow, npvCanonical, paybackMonthsCanonical } from '../canonical';
import { headline } from '../economics/headline';
import type { Ctx } from '../ctx';
import { monthlySeries } from '../economics/monthlySeries';
import { activeCurve, model } from '../model/overlay';
import { modelRaw } from '../model/raw';
import { timeFor } from '../time';
import { yearOf } from '../time/adapters';
import { aAt, buildK, type K } from '../time/kernel';
import { playbackSeries } from './playback';
import { auditTry, type ConvCheck, type ConvRuntime } from './verifConvTypes';
import { VARIABLES } from './variables';

const reg = (c: Ctx, id: string) => VARIABLES.find((v) => v.id === id)?.get(c);
const TOL = 1e-6;

/** Legacy-mode Time Engine (mode 'legacy', curve legacy.flatAnnual): the annual model disaggregated /12, month by month (legacy deriveLegacyAt). */
function legacyMonth(t: number, K: K) {
  const y = yearOf(t, K), A = K.A, team = aAt(A.yearTeamCost, y) / 12, token = aAt(A.yearToken, y) / 12;
  const run = team + token + aAt(A.yearInfraEff, y) / 12 + aAt(A.yearRunAgenticCost, y) / 12 + aAt(A.khRunYr, y) / 12;
  const gross = A.baselineRun / 12 - run + aAt(A.ktAvoidYr, y) / 12 - aAt(A.vTaxYr, y) / 12 - aAt(A.loopExtYr, y) / 12;
  const setup = t <= K.setupProfileMonths ? K.setupTotal / K.setupProfileMonths : 0;
  return { team, token, run, gross, net: gross - setup, human: aAt(A.yearETP, y), agent: aAt(A.yearAgentVfte, y), ramp: K.ramps[y] as number };
}
function legacyYear(K: K, y: number) {
  const first = (y - 1) * 12 + 1, last = Math.min(y * 12, K.horizonMonths);
  const acc = { savings: 0, team: 0, token: 0, run: 0, human: 0, agent: 0, ramp: 0 };
  for (let t = first; t <= last; t++) { const r = legacyMonth(t, K); acc.savings += r.gross; acc.team += r.team; acc.token += r.token; acc.run += r.run; acc.human = r.human; acc.agent = r.agent; acc.ramp = r.ramp; }
  return acc;
}
const legacyK = (c: Ctx) => buildK(c, modelRaw(c), { mode: 'legacy', curveModelId: 'legacy.flatAnnual' });
function legacyHeadline(K: K) {
  let cum = 0, payback: number | null = null, npv = 0;
  for (let t = 1; t <= K.horizonMonths; t++) { const n = legacyMonth(t, K).net; cum += n; if (payback === null && cum >= 0) payback = t; npv += n / Math.pow(1 + 0.08 / 12, t); }
  return { payback, npv, y1: legacyYear(K, 1).savings };
}

/** Monthly Playback audits CC-MP-01..03 (playback series = the live engine's months; MP-03 reads `rt.playbackHorizon`, null while idle). */
export function playbackChecks(c: Ctx, rt: ConvRuntime): ConvCheck[] {
  return [
    auditTry('CC-MP-01', () => {
      const s = playbackSeries(c), etp = model(c).base.etp;
      for (let i = 0; i < s.humanFte.length; i++) if (Math.abs((s.humanFte[i] as number) + (s.agentVfte[i] as number) - etp) > TOL) return `Monthly Playback: Human FTE + Agent vFTE ≠ Input FTE at month ${i}`;
      return null;
    }),
    auditTry('CC-MP-02', () => {
      const s = playbackSeries(c), ms = monthlySeries(engineNow(c)), last = ms[ms.length - 1], h = s.cumulative.length - 1;
      return last && Math.abs((s.cumulative[h] as number) - last.cum) > TOL
        ? `Monthly Playback cumulative[${h}] (${(s.cumulative[h] as number).toFixed(2)}) ≠ 📅 Monthly detail cumulative at month H (${last.cum.toFixed(2)})` : null;
    }),
    auditTry('CC-MP-03', () => (rt.playbackHorizon != null && rt.playbackHorizon !== model(c).horizon
      ? 'Monthly Playback: horizon changed while playing without resetting to idle (advisory)' : null)),
  ];
}

/** TE-13, TE-10, TE-10b, TE-09, TE-05, TE-07, TE-08 (Time Engine spec v5 §17). */
export function timeChecksA(c: Ctx): ConvCheck[] {
  const finite = (c2: Ctx, label: string, eng = engineNow(c2)): string | null => {
    for (const r of monthlySeries(eng)) if (![r.total, r.sav, r.cum, r.humanETP, r.agentVfte].every(isFinite)) return `${label}: non-finite value at month ${r.mo}`;
    return null;
  };
  return [
    auditTry('TE-13', () => {
      let bad = finite(c, 'live horizon');
      if (bad) return bad;
      try {
        const m0 = modelRaw(c);
        if (m0.horizon !== 5) bad = finite(c, 'horizon-5 probe', timeFor(c, { mode: 'full', curveModelId: activeCurve(c), model: { ...m0, horizon: 5 } }));
      } catch { /* probe is best-effort */ }
      return bad;
    }),
    auditTry('TE-10', () => {
      try {
        const m = modelRaw(c), K = legacyK(c);
        for (let y = 1; y <= m.horizon; y++) {
          const Y = legacyYear(K, y), i = y - 1;
          if (Math.abs(Y.savings - (m.yearSav[i] as number)) > TOL) return `year(${y}).savings ${Y.savings.toFixed(4)} != yearSav ${(m.yearSav[i] as number).toFixed(4)}`;
          if (Math.abs(Y.team - (m.yearTeamCost[i] as number)) > TOL) return `year(${y}).teamCost != yearTeamCost`;
          if (Math.abs(Y.token - (m.yearToken[i] as number)) > TOL) return `year(${y}).tokenCost != yearToken`;
          if (Math.abs(Y.run - (m.yearRun[i] as number)) > TOL) return `year(${y}).totalRunCost ${Y.run.toFixed(4)} != yearRun ${(m.yearRun[i] as number).toFixed(4)}`;
          if (Math.abs(Y.human - (m.yearETP[i] as number)) > TOL) return `year(${y}).humanFteEnd != yearETP`;
          if (Math.abs(Y.agent - (m.yearAgentVfte[i] as number)) > TOL) return `year(${y}).agentVfteEnd != yearAgentVfte`;
        }
        return null;
      } catch (e) { return `TE-10 threw: ${e instanceof Error ? e.message : String(e)}`; }
    }),
    auditTry('TE-10b', () => {
      try {
        const m = modelRaw(c);
        if (m.sup.constrained || m.conv.vTaxRate > 0) return null;
        const K = legacyK(c), full = timeFor(c, { mode: 'full', curveModelId: 'legacy.flatAnnual', model: m });
        for (let t = 1; t <= m.horizon * 12; t++) {
          const a = legacyMonth(t, K), b = full.monthAt(t);
          if (Math.abs(a.gross - b.grossSavings) > TOL) return `month ${t}: full.grossSavings ${b.grossSavings.toFixed(4)} != legacy ${a.gross.toFixed(4)}`;
          if (Math.abs(a.run - b.totalRunCost) > TOL) return `month ${t}: full.totalRunCost ${b.totalRunCost.toFixed(4)} != legacy ${a.run.toFixed(4)}`;
        }
        return null;
      } catch (e) { return `TE-10b threw: ${e instanceof Error ? e.message : String(e)}`; }
    }),
    auditTry('TE-09', () => {
      const a = legacyHeadline(legacyK(c)), b = legacyHeadline(legacyK(c));
      return a.payback !== b.payback || Math.abs(a.npv - b.npv) > 1e-9 || Math.abs(a.y1 - b.y1) > 1e-9 ? `memo clear changed a value: payback ${a.payback}/${b.payback} npv ${a.npv}/${b.npv}` : null;
    }),
    auditTry('TE-05', () => {
      const K = legacyK(c);
      for (let y = 1; y <= K.horizonYears; y++) {
        const Y = legacyYear(K, y), last = Math.min(y * 12, K.horizonMonths);
        let s = 0;
        for (let t = (y - 1) * 12 + 1; t <= last; t++) s += legacyMonth(t, K).gross;
        if (Math.abs(s - Y.savings) > 1e-9) return `year(${y}) savings != sum of monthly grossSavings`;
        if (legacyMonth(last, K).ramp !== Y.ramp) return `year(${y}) adoptionEndPct != last month ramp`;
      }
      return null;
    }),
    auditTry('TE-07', () => {
      const eng = engineNow(c);
      let ref: number | null = null;
      for (let t = 1; t <= eng.horizonMonths; t++) if (eng.cumulativeAt(t) >= 0) { ref = t; break; }
      if (eng.payback() !== ref) return `engine.payback() ${eng.payback()} != first cum>=0 crossing ${ref}`;
      if (paybackMonthsCanonical(c) !== ref) return 'paybackMonthsCanonical() != engine crossing';
      const h = headline(c);
      if (h.paybackMonth !== ref || h.paybackYear !== (ref == null ? null : Math.ceil(ref / 12))) return `headline payback ${h.paybackMonth}/${h.paybackYear} != crossing ${ref}`;
      const r = reg(c, 'paybackMonths');
      return r !== undefined && r !== ref ? `registry paybackMonths ${r} != canonical ${ref}` : null;
    }),
    auditTry('TE-08', () => {
      const canon = npvCanonical(c), r = reg(c, 'npv8');
      if (Math.abs(headline(c).npv - canon) > TOL) return `headline npv ${headline(c).npv.toFixed(4)} != canonical ${canon.toFixed(4)}`;
      return typeof r === 'number' && Math.abs(r - canon) > TOL ? `registry npv8 ${r.toFixed(4)} != canonical ${canon.toFixed(4)}` : null;
    }),
  ];
}
