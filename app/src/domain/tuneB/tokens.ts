/** @calc-zone run-setup-taxes @owner token-volume */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { PHASES } from '../catalog';
import { model } from '../model/overlay';
import { activeArtefacts } from '../scope';
import { blendedTokenCostPer1M, tokMixTotal } from '../tokens';

/** Annual token volume per horizon year (legacy tokenUsageEstimate): agent vFTE × working days × runs/day × tokens per run. */
export interface TokenUsage {
  totM: number[]; agentRuns: number[]; y3: number; inputM: number; outputM: number; tpa: number; runsY3: number;
  blended: number; costY3: number; outShare: number; endLabel: string; mixTotal: number;
}

const memo = new WeakMap<Ctx, TokenUsage>();
export function tokenUsage(c: Ctx): TokenUsage {
  const hit = memo.get(c); if (hit) return hit;
  const m = model(c), outS = c.s.TOK_OUT_SHARE / 100;
  let rpd = c.inp.p('runsPerDay'); if (isNaN(rpd)) rpd = 25; rpd = Math.max(0, rpd);
  const agentRuns = engineNow(c).years().map((y) => y.agentVfteEnd * m.wd * rpd);
  const totM = agentRuns.map((r) => (r * m.tokensPerArt) / 1e6), e = totM.length - 1, y3 = totM[e] as number;
  const blended = blendedTokenCostPer1M(c.s);
  const r: TokenUsage = { totM, agentRuns, y3, inputM: y3 * (1 - outS), outputM: y3 * outS, tpa: m.tokensPerArt, runsY3: agentRuns[e] as number,
    blended, costY3: y3 * blended, outShare: c.s.TOK_OUT_SHARE, endLabel: `Y${totM.length}`, mixTotal: tokMixTotal(c.s) };
  memo.set(c, r); return r;
}

export interface ModelRow { index: number; name: string; mix: number; priceIn: number; priceOut: number; volM: number; cost: number }
/** Per-model volume and cost of the horizon-end year, distributed by mix (legacy renderTokenModels). */
export function tokenModelRows(c: Ctx): { rows: ModelRow[]; mixSum: number; costTot: number } {
  const u = tokenUsage(c), outS = c.s.TOK_OUT_SHARE / 100, inS = 1 - outS, mixTot = u.mixTotal || 1;
  let mixSum = 0, costTot = 0;
  const rows = c.s.TOKEN_MODELS.map((m, index) => {
    const volM = (u.y3 * (m.mix || 0)) / mixTot, cost = volM * (inS * (m.priceIn || 0) + outS * (m.priceOut || 0));
    mixSum += m.mix || 0; costTot += cost;
    return { index, name: m.name, mix: m.mix, priceIn: m.priceIn, priceOut: m.priceOut, volM, cost };
  });
  return { rows, mixSum, costTot };
}

export interface RunRow { key: string; label: string; mix?: number; phase?: string; phaseName?: string; isReg?: boolean; runs: number[]; total: number; tokM: number; cost: number }
export interface RunTable { rows: RunRow[]; totals: RunRow }
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
function totalsOf(rows: RunRow[], H: number, label: string, mix?: number): RunRow {
  return { key: 'total', label, mix, runs: Array.from({ length: H }, (_, i) => sum(rows.map((r) => r.runs[i] as number))),
    total: sum(rows.map((r) => r.total)), tokM: sum(rows.map((r) => r.tokM)), cost: sum(rows.map((r) => r.cost)) };
}

/** Agent runs and run cost by model and year (legacy renderAgentRuns). */
export function agentRunTable(c: Ctx): RunTable {
  const u = tokenUsage(c), outS = c.s.TOK_OUT_SHARE / 100, inS = 1 - outS, mixTot = u.mixTotal || 1;
  const rows = c.s.TOKEN_MODELS.map((m, i) => {
    const sh = (m.mix || 0) / mixTot, runs = u.agentRuns.map((r) => r * sh), total = sum(runs), tokM = (total * u.tpa) / 1e6;
    return { key: `m${i}`, label: m.name, mix: m.mix, runs, total, tokM, cost: tokM * (inS * (m.priceIn || 0) + outS * (m.priceOut || 0)) };
  });
  return { rows, totals: totalsOf(rows, u.agentRuns.length, 'Total', u.mixTotal) };
}

/** Agent runs allocated to each in-scope artefact by effort × agent supervision (legacy renderArtifactRuns). */
export function artifactRunTable(c: Ctx): RunTable {
  const u = tokenUsage(c), act = activeArtefacts(c.a, c.s);
  const denom = act.reduce((s, a) => s + (a.effort || 0) * (a.agentSup || 0), 0) || 1;
  const pidx = new Map<string, number>(PHASES.map((p, i) => [p.id, i])), pname = new Map<string, string>(PHASES.map((p) => [p.id, p.name]));
  pname.set('Cross-cutting', 'Cross-cutting (regulatory)');
  const sorted = act.slice().sort((a, b) => ((pidx.get(a.phase) ?? 99) - (pidx.get(b.phase) ?? 99)) || String(a.name).localeCompare(String(b.name)));
  const rows = sorted.map((a) => {
    const sh = ((a.effort || 0) * (a.agentSup || 0)) / denom, runs = u.agentRuns.map((r) => r * sh), total = sum(runs), tokM = (total * u.tpa) / 1e6;
    return { key: a.id, label: a.name, phase: a.phase, phaseName: pname.get(a.phase) ?? a.phase, isReg: !!a.isReg, runs, total, tokM, cost: tokM * u.blended };
  });
  return { rows, totals: totalsOf(rows, u.agentRuns.length, `Total (${act.length} in-scope)`) };
}
