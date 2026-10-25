/** @calc-zone workspace-config */
import type { Ctx } from '../ctx';
import { REG_ARTEFACTS, SDLC_ARTEFACTS } from '../catalog';
import { activeArtefacts } from '../scope';
import { minSample } from './params';
import { tagMap } from './tags';
import type { FactoryData, FgParams } from './types';

/** A task = an SDLC / regulatory artefact with its factory tags (capability and who does the work). */
export interface Task { id: string; capability?: string; agentActivityType?: string }
export type KpiData = Pick<FactoryData,
  'DEPLOYMENTS' | 'ENVIRONMENTS' | 'RELEASE_CANDIDATES' | 'MONITORING_EVENTS' | 'APPROVALS' | 'QUALITY_GATES' | 'COMMITS' | 'BUILDS' | 'FEEDBACK_ITEMS'> & {
  tasks: Task[] };

/** Tasks the Delivery KPIs count: the artefacts in scope (all of the catalogue when none is, or when scope-awareness is switched off). */
export function factoryTasks(c: Ctx): Task[] {
  const tags = tagMap(c), scopeAware = (c.s as unknown as { fgScopeAwareTasks?: boolean }).fgScopeAwareTasks !== false;
  const tag = (id: string): Task => { const t = tags.get(id); return { id, capability: t?.capability, agentActivityType: t?.agentActivityType }; };
  const all = () => SDLC_ARTEFACTS.concat(REG_ARTEFACTS).map((a) => tag(a.id));
  if (!scopeAware) return all();
  const act = activeArtefacts(c.a, c.s);
  return act.length ? act.map((a) => tag(a.id)) : all();
}

const DAY = 86400000;
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const pct = (n: number, d: number) => (d ? (n / d) * 100 : 0);
const time = (s: string | null | undefined) => new Date(s as string).getTime();

/** Production environments: the isProd flag, else the name "Production", else the highest stage. */
export function prodEnvIds(envs: KpiData['ENVIRONMENTS']): Set<string> {
  let p = envs.filter((e) => e.isProd);
  if (!p.length) p = envs.filter((e) => e.name === 'Production');
  if (!p.length && envs.length) { const mx = Math.max(...envs.map((e) => e.seq || 0)); p = envs.filter((e) => (e.seq || 0) === mx); }
  return new Set(p.map((e) => e.id));
}
const prodDeploys = (d: KpiData) => {
  const p = prodEnvIds(d.ENVIRONMENTS);
  return d.DEPLOYMENTS.filter((x) => x.environmentId != null && p.has(x.environmentId) && x.deployedAt);
};
const decided = (d: KpiData) => d.QUALITY_GATES.filter((g) => g.result === 'Pass' || g.result === 'Fail');

export function deployFreqPerMonth(d: KpiData): number {
  const t = prodDeploys(d).map((x) => time(x.deployedAt)).filter((x) => !isNaN(x));
  if (t.length < 2) return 0;   // a single point has no observable frequency
  return t.length / Math.max(1, (Math.max(...t) - Math.min(...t)) / (DAY * 30));
}
export function promotionLeadDays(d: KpiData): number {
  const days = d.RELEASE_CANDIDATES.map((rc) => {
    const dep = d.DEPLOYMENTS.filter((x) => x.releaseCandidateId === rc.id && x.deployedAt);
    if (!rc.cutAt || !dep.length) return null;
    const latest = dep.reduce((m, x) => (time(x.deployedAt) > time(m.deployedAt) ? x : m));
    const v = (time(latest.deployedAt) - time(rc.cutAt)) / DAY;
    return isNaN(v) ? null : v;
  }).filter((x): x is number => x != null);
  return mean(days);
}
export function envStabilityDays(d: KpiData): number {
  const t = d.MONITORING_EVENTS.map((m) => time(m.timestamp)).filter((x) => !isNaN(x)).sort((a, b) => a - b);
  return t.length < 2 ? 0 : mean(t.slice(1).map((x, i) => (x - (t[i] as number)) / DAY));
}
export const approvalDurationDays = (d: KpiData): number =>
  mean(d.APPROVALS.filter((a) => a.decidedAt && a.requestedAt).map((a) => (time(a.decidedAt) - time(a.requestedAt)) / DAY).filter((x) => !isNaN(x) && x >= 0));
export function avgCommitsPerTask(d: KpiData): number {
  const by: Record<string, number> = {};
  d.COMMITS.forEach((c) => { if (c.taskId) by[c.taskId] = (by[c.taskId] || 0) + 1; });
  return mean(Object.values(by));
}

export type KpiFormat = 'DEC1' | 'PCT' | 'INT';
export interface KpiDef { id: string; label: string; format: KpiFormat; unit: string; group: 0 | 1 | 2; get(d: KpiData): number; sample?(d: KpiData): number }
const dated = (d: KpiData) => d.DEPLOYMENTS.filter((x) => x.deployedAt).length;
/** The 14 DORA + agentic KPIs (legacy VARIABLE_REGISTRY fm*), grouped for the Factory Timeline. `sample` = events behind a rate. */
export const KPIS: KpiDef[] = [
  { id: 'fmDeployFreq', label: 'Deployment frequency', format: 'DEC1', unit: '/mo', group: 0, get: deployFreqPerMonth, sample: (d) => prodDeploys(d).length },
  { id: 'fmPromotionLeadDays', label: 'Promotion lead time', format: 'DEC1', unit: 'days', group: 0, get: promotionLeadDays, sample: dated },
  { id: 'fmRollbackRate', label: 'Rollback rate', format: 'PCT', unit: '%', group: 0,
    get: (d) => pct(d.DEPLOYMENTS.filter((x) => x.status === 'RolledBack').length, d.DEPLOYMENTS.length), sample: (d) => d.DEPLOYMENTS.length },
  { id: 'fmFailedDeployRate', label: 'Failed-deployment rate', format: 'PCT', unit: '%', group: 0,
    get: (d) => pct(d.DEPLOYMENTS.filter((x) => x.status === 'Failed').length, d.DEPLOYMENTS.length), sample: (d) => d.DEPLOYMENTS.length },
  { id: 'fmEnvStabilityDays', label: 'Environment stability (mean days between monitoring events)', format: 'DEC1', unit: 'days', group: 0,
    get: envStabilityDays, sample: (d) => d.MONITORING_EVENTS.length },
  { id: 'fmApprovalDurationDays', label: 'Approval duration', format: 'DEC1', unit: 'days', group: 0, get: approvalDurationDays,
    sample: (d) => d.APPROVALS.filter((a) => a.requestedAt && a.decidedAt).length },
  { id: 'fmAutonomousCompletion', label: 'Autonomous completion rate (Tasks)', format: 'PCT', unit: '%', group: 1,
    get: (d) => pct(d.tasks.filter((a) => a.agentActivityType === 'Agent').length, d.tasks.length) },
  { id: 'fmHumanIntervention', label: 'Human intervention rate (Tasks)', format: 'PCT', unit: '%', group: 1,
    get: (d) => pct(d.tasks.filter((a) => a.agentActivityType !== 'Agent').length, d.tasks.length) },
  { id: 'fmGatePassRate', label: 'Quality-gate pass rate', format: 'PCT', unit: '%', group: 2,
    get: (d) => pct(decided(d).filter((g) => g.result === 'Pass').length, decided(d).length), sample: (d) => decided(d).length },
  { id: 'fmGateReworkRate', label: 'Quality-gate rework rate', format: 'PCT', unit: '%', group: 2,
    get: (d) => pct(decided(d).filter((g) => g.result === 'Fail').length, decided(d).length), sample: (d) => decided(d).length },
  { id: 'fmCommitVolume', label: 'Generated change volume (commit count)', format: 'INT', unit: '', group: 2, get: (d) => d.COMMITS.length },
  { id: 'fmAgentTestShare', label: 'Agent-driven test share (capability=Test Tasks)', format: 'PCT', unit: '%', group: 2,
    get: (d) => { const t = d.tasks.filter((a) => a.capability === 'Test'); return pct(t.filter((a) => a.agentActivityType === 'Agent').length, t.length); } },
  { id: 'fmAvgCommitsPerTask', label: 'Avg commits per Task', format: 'DEC1', unit: '', group: 2, get: avgCommitsPerTask, sample: (d) => d.COMMITS.length },
  { id: 'fmBuildSuccessRate', label: 'Build success rate', format: 'PCT', unit: '%', group: 2,
    get: (d) => pct(d.BUILDS.filter((b) => b.status === 'Success').length, d.BUILDS.length), sample: (d) => d.BUILDS.length },
];
export const KPI_GROUPS = ['🚀 Release pipeline', '🏭 Delivery — Tasks', '⚙️ Engineering'];

export interface KpiCard { id: string; label: string; display: string; thin: boolean; n: number | null }
/** What a KPI card shows: the value, or a dash plus the sample size when a rate rests on fewer events than `minSample`. */
export function kpiCard(k: KpiDef, d: KpiData, p: FgParams): KpiCard {
  const n = k.sample ? k.sample(d) : null, thin = n !== null && n < minSample(p), v = k.get(d);
  const txt = k.format === 'PCT' ? `${Math.round(v)}%` : k.format === 'INT' ? Math.round(v).toLocaleString('en-US') : v.toFixed(1);
  const showUnit = k.unit && (k.format === 'DEC1' || k.format === 'INT');
  return { id: k.id, label: k.label, thin, n, display: thin ? '—' : txt + (showUnit ? ` ${k.unit}` : '') };
}
