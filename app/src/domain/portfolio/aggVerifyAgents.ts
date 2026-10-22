import { PHASES } from '../catalog';
import { loopExternalReworkEffort } from '../model/loops';
import { agentDirectory, AUTH_LEVELS, loopInternalTokenCost, rolesForPhase } from '../verifyA/agents';
import { agentDetail, agentUsage, artifactRuns } from '../verifyA/agentUse';
import { phaseArtRows, supMatrix } from '../verifyA/phaseArt';
import { colOf, liveOf, productRows, sum, viewMemo, type Cell, type VCol, type VTable } from './aggVerifyBase';
import { byYear } from './series';

const num = (key: string, header: string, kind: VCol['kind'] = 'n1', title?: string): VCol => ({ key, header, kind, title });
const totals = (rows: Parameters<typeof colOf>[0], keys: string[]): Record<string, Cell> => Object.fromEntries(keys.map((k) => [k, sum(colOf(rows, k))]));

const USAGE: VCol[] = [num('vfte', 'Agent vFTE'), num('arts', 'Artifacts / month', 'int'), num('runs', 'Agent runs (horizon)', 'int'), num('tokensM', 'Tokens, last year (M)', 'int'), num('tokenCost', 'Token cost, last year', 'eur'), num('count', 'In-scope artifacts', 'int')];
export interface UsageAgg {
  label: string;
  /** calendar years: agent vFTE at year end, token and infrastructure cost (consolidated series) */
  years: { label: string; vfte: number; tokenCost: number; infra: number }[];
  phases: { id: string; name: string; n: number; effort: number }[];
  auth: { level: string; n: number; effort: number; share: number }[];
  table: VTable;
}

/** Agent usage of a selection: runs, tokens and cost per product, and the agent effort by phase and authorization level, added up (calendar years from the consolidation). */
export const usageAgg = viewMemo((sel): UsageAgg => {
  const us = sel.items.map((v) => agentUsage(liveOf(v))), L = sel.series.net.length, tokens = byYear(sel.series.token), infra = byYear(sel.series.infra);
  const years = tokens.map((t, k) => ({ label: `Year ${k + 1}`, vfte: sel.series.agentVfte[Math.min(12 * k + 11, L - 1)] ?? 0, tokenCost: t, infra: infra[k] ?? 0 }));
  const ids = [...new Set(us.flatMap((u) => u.phases.map((p) => p.id)))].sort((a, b) => PHASES.findIndex((p) => p.id === a) - PHASES.findIndex((p) => p.id === b));
  const phases = ids.map((id) => {
    const ps = us.flatMap((u) => u.phases.filter((p) => p.id === id));
    return { id, name: ps[0]!.name, n: sum(ps.map((p) => p.n)), effort: sum(ps.map((p) => p.effort)) };
  });
  const eff = AUTH_LEVELS.map((level) => ({ level, n: sum(us.map((u) => u.auth.find((a) => a.level === level)?.n ?? 0)), effort: sum(us.map((u) => u.auth.find((a) => a.level === level)?.effort ?? 0)) }));
  const tot = sum(eff.map((a) => a.effort)) || 1;
  const rows = productRows(sel, (v, l) => {
    const s = us[sel.items.indexOf(v)]!.summary;
    return { vfte: s.vfte, arts: s.artsPerMonth, runs: artifactRuns(l).totals.total, tokensM: s.tokensM, tokenCost: s.tokenCost, count: s.count };
  });
  return { label: sel.label, years, phases, auth: eff.map((a) => ({ ...a, share: (a.effort / tot) * 100 })), table: { columns: USAGE, rows, total: totals(rows, ['vfte', 'arts', 'runs', 'tokensM', 'tokenCost', 'count']) } };
});

const DIR: VCol[] = [num('agents', 'Agents', 'int'), ...AUTH_LEVELS.map((a, i) => num(`l${i}`, a, 'int')), num('roles', 'Active roles', 'int'), num('avgSup', 'Avg. agentSup', 'pct'),
  { key: 'loop', header: 'Internal loop', kind: 'text' }, num('loopTok', 'Loop tokens (M, est.)', 'n2'), { key: 'ext', header: 'External rework', kind: 'text' }];

/** Agent directory of a selection: the agents by authorization level, the roles and the loop settings of each product; the line is the union (an agent counted once). */
export const agentDirTable = viewMemo((sel): VTable => {
  const dirs = sel.items.map((v) => agentDirectory(liveOf(v).c, 'ALL')), roles = sel.items.map((v) => rolesForPhase(liveOf(v).c, 'ALL'));
  const lvl = (d: (typeof dirs)[number], i: number) => d.filter((a) => a.agent.aiAuth === AUTH_LEVELS[i]).length;
  const rows = productRows(sel, (v, l) => {
    const d = dirs[sel.items.indexOf(v)]!, sups = d.flatMap((a) => (a.avgSup == null ? [] : [a.avgSup])), loop = loopInternalTokenCost(l.c);
    return { agents: d.length, ...Object.fromEntries(AUTH_LEVELS.map((_, i) => [`l${i}`, lvl(d, i)])), roles: roles[sel.items.indexOf(v)]!.length,
      avgSup: sups.length ? Math.round(sum(sups) / sups.length) : null, loop: loop.applied ? 'on' : 'off', loopTok: loop.totM, ext: loopExternalReworkEffort(l.c).some((p) => p.applied) ? 'on' : 'off' };
  });
  const union = new Map(dirs.flat().map((a) => [a.agent.id, a.agent.aiAuth]));
  const un = (i: number) => [...union.values()].filter((x) => x === AUTH_LEVELS[i]).length;
  return { columns: DIR, rows, total: { agents: union.size, ...Object.fromEntries(AUTH_LEVELS.map((_, i) => [`l${i}`, un(i)])), roles: new Set(roles.flat()).size, avgSup: null, loop: null, loopTok: sum(colOf(rows, 'loopTok')), ext: null } };
});

const DETAIL: VCol[] = [num('run', 'Agentic run FTE'), num('sup', 'Supervision pole (FTE)'), num('rate', 'Run day rate', 'eur'), ...AUTH_LEVELS.map((a, i) => num(`l${i}`, `${a} (artifacts)`, 'int'))];

/** Agent details of a selection: the agentic run team and supervision pole of each product, and its artifacts per authorization level; FTE and counts are added up. */
export const agentDetailTable = viewMemo((sel): VTable => {
  const rows = productRows(sel, (_v, l) => {
    const d = agentDetail(l);
    return { run: d.runTotal, sup: d.supETP, rate: d.runRate, ...Object.fromEntries(d.auth.map((a, i) => [`l${i}`, a.count])) };
  });
  return { columns: DETAIL, rows, total: { ...totals(rows, ['run', 'sup', ...AUTH_LEVELS.map((_, i) => `l${i}`)]), rate: null } };
});

const PHASE: VCol[] = [num('phases', 'Phases in scope', 'int'), num('arts', 'In-scope artifacts', 'int'), { key: 'tight', header: 'Tightest phase', kind: 'text' },
  num('margin', 'Tightest margin (pts)', 'int', 'Projected human share minus the supervision floor; negative = floor violated (CC-SUP-01)'), num('viol', 'Floor violations', 'int'), num('vfte', 'vFTE at horizon end (relative)')];

/** Phase / artifact scope of a selection: phases and artifacts in scope, the tightest supervision margin and the floor violations of each product (violations and artifact counts add up). */
export const phaseArtTable = viewMemo((sel): VTable => {
  const rows = productRows(sel, (_v, l) => {
    const sup = supMatrix(l), tight = sup.reduce<(typeof sup)[number] | null>((m, r) => (m === null || r.gap < m.gap ? r : m), null), pa = phaseArtRows(l);
    return { phases: pa.rows.length, arts: sum(sup.map((r) => r.n)), tight: tight?.phase ?? '—', margin: tight ? Math.round(tight.gap) : null, viol: sup.filter((r) => r.gap < 0).length, vfte: sum(pa.rows.map((r) => r.vfte)) };
  });
  return { columns: PHASE, rows, total: { ...totals(rows, ['arts', 'viol']), phases: null, tight: null, margin: null, vfte: null } };
});
