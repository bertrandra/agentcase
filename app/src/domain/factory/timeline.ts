/** @calc-zone workspace-config */
import type { FactoryData } from './types';
import { tok } from '../theme';

export const LANES = ['Commits', 'Builds', 'Release Candidates', 'Approvals', 'Deployments', 'Monitoring', 'Feedback'] as const;
export interface TimelineEvent { date: string; lane: (typeof LANES)[number]; label: string; color: string; t: number }
type Source = Pick<FactoryData, 'COMMITS' | 'BUILDS' | 'RELEASE_CANDIDATES' | 'APPROVALS' | 'DEPLOYMENTS' | 'MONITORING_EVENTS' | 'FEEDBACK_ITEMS' | 'ENVIRONMENTS'>;

const C = { get BLUE() { return tok('chart-cat-1'); }, get TEAL() { return tok('chart-cat-2'); }, get BRICK() { return tok('danger-800'); }, get AMBER() { return tok('chart-cat-3'); }, get PURPLE() { return tok('chart-cat-4'); } };

/** Every dated event of the Release-pipeline and Engineering domains, one lane per type (events without a parsable date are dropped). */
export function timelineEvents(d: Source): TimelineEvent[] {
  const env = (id: string | null) => d.ENVIRONMENTS.find((e) => e.id === id)?.name ?? '(none)';
  const all: Omit<TimelineEvent, 't'>[] = [
    ...d.COMMITS.filter((c) => c.committedAt).map((c) => ({ date: c.committedAt, lane: 'Commits' as const, label: c.message || '(commit)', color: C.BLUE })),
    ...d.BUILDS.filter((b) => b.builtAt).map((b) => ({ date: b.builtAt, lane: 'Builds' as const, label: b.name, color: b.status === 'Success' ? C.TEAL : C.BRICK })),
    ...d.RELEASE_CANDIDATES.filter((r) => r.cutAt).map((r) => ({ date: r.cutAt, lane: 'Release Candidates' as const, label: r.name, color: C.PURPLE })),
    ...d.APPROVALS.filter((a) => a.decidedAt).map((a) => ({ date: a.decidedAt as string, lane: 'Approvals' as const, label: `${a.approver || '?'}: ${a.decision}`, color: a.decision === 'Approved' ? C.TEAL : C.BRICK })),
    ...d.DEPLOYMENTS.filter((x) => x.deployedAt).map((x) => ({ date: x.deployedAt, lane: 'Deployments' as const, label: `${env(x.environmentId)} · ${x.status}`, color: x.status === 'Success' ? C.TEAL : x.status === 'Failed' ? C.BRICK : C.AMBER })),
    ...d.MONITORING_EVENTS.filter((m) => m.timestamp).map((m) => ({ date: m.timestamp, lane: 'Monitoring' as const, label: m.description || '(event)', color: m.severity === 'Critical' ? C.BRICK : m.severity === 'Warning' ? C.AMBER : C.BLUE })),
    ...d.FEEDBACK_ITEMS.filter((f) => f.createdAt).map((f) => ({ date: f.createdAt, lane: 'Feedback' as const, label: f.description || '(feedback)', color: C.TEAL })),
  ];
  return all.map((e) => ({ ...e, t: new Date(e.date).getTime() })).filter((e) => !isNaN(e.t));
}

/** The shared calendar axis: first and last event (a single day is widened by a day each side), and the position of a time on it in %. */
export function timelineAxis(events: TimelineEvent[], ticks = 6) {
  const times = events.map((e) => e.t);
  let min = Math.min(...times), max = Math.max(...times);
  if (min === max) { min -= 86400000; max += 86400000; }
  const span = max - min;
  return { min, max, pct: (t: number) => ((t - min) / span) * 100, ticks: Array.from({ length: ticks + 1 }, (_, i) => ({ at: (i / ticks) * 100, t: min + (span * i) / ticks })) };
}
