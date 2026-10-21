import type { FactoryData } from './types';

export const LANES = ['Commits', 'Builds', 'Release Candidates', 'Approvals', 'Deployments', 'Monitoring', 'Feedback'] as const;
export interface TimelineEvent { date: string; lane: (typeof LANES)[number]; label: string; color: string; t: number }
type Source = Pick<FactoryData, 'COMMITS' | 'BUILDS' | 'RELEASE_CANDIDATES' | 'APPROVALS' | 'DEPLOYMENTS' | 'MONITORING_EVENTS' | 'FEEDBACK_ITEMS' | 'ENVIRONMENTS'>;

const BLUE = '#0058AB', TEAL = '#006e79', BRICK = '#8F3237', AMBER = '#b04600', PURPLE = '#71609E';

/** Every dated event of the Release-pipeline and Engineering domains, one lane per type (events without a parsable date are dropped). */
export function timelineEvents(d: Source): TimelineEvent[] {
  const env = (id: string | null) => d.ENVIRONMENTS.find((e) => e.id === id)?.name ?? '(none)';
  const all: Omit<TimelineEvent, 't'>[] = [
    ...d.COMMITS.filter((c) => c.committedAt).map((c) => ({ date: c.committedAt, lane: 'Commits' as const, label: c.message || '(commit)', color: BLUE })),
    ...d.BUILDS.filter((b) => b.builtAt).map((b) => ({ date: b.builtAt, lane: 'Builds' as const, label: b.name, color: b.status === 'Success' ? TEAL : BRICK })),
    ...d.RELEASE_CANDIDATES.filter((r) => r.cutAt).map((r) => ({ date: r.cutAt, lane: 'Release Candidates' as const, label: r.name, color: PURPLE })),
    ...d.APPROVALS.filter((a) => a.decidedAt).map((a) => ({ date: a.decidedAt as string, lane: 'Approvals' as const, label: `${a.approver || '?'}: ${a.decision}`, color: a.decision === 'Approved' ? TEAL : BRICK })),
    ...d.DEPLOYMENTS.filter((x) => x.deployedAt).map((x) => ({ date: x.deployedAt, lane: 'Deployments' as const, label: `${env(x.environmentId)} · ${x.status}`, color: x.status === 'Success' ? TEAL : x.status === 'Failed' ? BRICK : AMBER })),
    ...d.MONITORING_EVENTS.filter((m) => m.timestamp).map((m) => ({ date: m.timestamp, lane: 'Monitoring' as const, label: m.description || '(event)', color: m.severity === 'Critical' ? BRICK : m.severity === 'Warning' ? AMBER : BLUE })),
    ...d.FEEDBACK_ITEMS.filter((f) => f.createdAt).map((f) => ({ date: f.createdAt, lane: 'Feedback' as const, label: f.description || '(feedback)', color: TEAL })),
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
