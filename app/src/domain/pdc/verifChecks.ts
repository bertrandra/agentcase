import type { Ctx } from '../ctx';
import { engineNow } from '../canonical';
import { monthlySeries } from '../economics/monthlySeries';
import { model } from '../model/overlay';
import { fmtK } from './verifFormat';
import { humanFte, targetTeam } from './verifTeam';

export interface VerifCheck { name: string; exp: string; got: string; ok: boolean }
const EPS = 1e-6;

/** The automatic consistency checks of the detailed logic verification (legacy renderVerif, checks 1-16). */
export function verifChecks(c: Ctx): VerifCheck[] {
  const m = model(c), t = targetTeam(c), s = monthlySeries(engineNow(c)), out: VerifCheck[] = [];
  const chk = (name: string, exp: string, got: string, ok: boolean) => out.push({ name, exp, got, ok });
  [0, 1, 2].forEach((i) => { const sum = m.yearETP[i]! + m.yearAgentVfte[i]!; chk(`Effort conservation Y${i + 1}`, `${m.base.etp.toFixed(2)} FTE`, `${sum.toFixed(2)} FTE`, Math.abs(sum - m.base.etp) < 0.01); });
  const m12 = s.slice(0, 12).reduce((a, x) => a + x.teamCost, 0);
  chk('Day-rate annual=monthly (Y1 team)', fmtK(m.yearTeamCost[0]!), fmtK(m12), Math.abs(m12 - m.yearTeamCost[0]!) / Math.max(1, m.yearTeamCost[0]!) < 0.02);
  chk('Dev+Sup = residual FTE', t.residualETP.toFixed(2), (t.devETP + t.supETP).toFixed(2), Math.abs(t.devETP + t.supETP - t.residualETP) < 0.01);
  chk('Total = residual + run', t.totalRecurrent.toFixed(2), (t.residualETP + t.runETP).toFixed(2), Math.abs(t.totalRecurrent - (t.residualETP + t.runETP)) < 0.01);
  [0, 1, 2].forEach((i) => {
    const expected = m.baselineRun - m.yearRun[i]! + (m.conv.ktAvoidYr[i] || 0) - (m.conv.vTaxYr[i] || 0) - (m.conv.loopExtYr[i] || 0);
    chk(`Benefit Y${i + 1} = baseline−run+KT−tax−ext`, fmtK(expected), fmtK(m.yearSav[i]!), Math.abs(expected - m.yearSav[i]!) < 1);
  });
  chk('Effective auto ≤ potentiel', `≤${m.auto}%`, `${m.eff.toFixed(1)}%`, m.eff <= m.auto + EPS && m.eff >= 0);
  chk('Scope weight ∈ ]0,1]', '0 < w ≤ 1', m.scope.weight.toFixed(3), m.scope.weight > 0 && m.scope.weight <= 1 + EPS);
  const cumFinal = s[s.length - 1]!.cum, sumNet = s.reduce((a, x) => a + (x.sav - x.setupSpend), 0);
  chk('Cumulative = Σ monthly nets', fmtK(sumNet), fmtK(cumFinal), Math.abs(cumFinal - sumNet) < 1);
  const spent = s.reduce((a, x) => a + x.setupSpend, 0);
  chk('Spread setup = Total setup', fmtK(m.setupTotal), fmtK(spent), Math.abs(spent - m.setupTotal) < 1);
  chk('Delivery FTE Y3 ≤ input FTE', `≤${m.base.etp.toFixed(1)}`, m.yearETP[2]!.toFixed(1), m.yearETP[2]! <= m.base.etp + EPS);
  chk('Total human FTE Y3 (delivery + AgentOps) ≤ input FTE', `≤${m.base.etp.toFixed(1)}`, humanFte(m, 2).toFixed(1), humanFte(m, 2) <= m.base.etp + EPS);
  const ops = m.yearRunAgenticETP?.[2] || 0;
  chk('Target FTE Y3 = delivery + agentic run team', `${m.yearETP[2]!.toFixed(2)} + ${ops.toFixed(2)}`, humanFte(m, 2).toFixed(2), Math.abs(humanFte(m, 2) - (m.yearETP[2]! + ops)) < 1e-9);
  return out;
}
