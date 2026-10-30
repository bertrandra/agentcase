/** @calc-zone delivery-views */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { GOV_GATES } from '../tune/maturityTab';
import { capability, TRANSITIONS } from '../tune/program';
import { programmeActivityId } from './ids';
import type { LaneRole } from './lanes';

/**
 * The milestones and gateways of the transformation programme (docs/SPEC_BPMN.md § 19.2, rows added 2026-10-30; phase B9a): the maturity
 * transitions L1 → L4 (gateways, Design Authority with the AI Office's sign-off; criteria `tune/program.ts` TRANSITIONS), the governance gates in
 * place (`tune/maturityTab.ts` GOV_GATES) and "target capability reached" (the capability build, `capability`). Per product, no cost. Placed at
 * the engine's crossings (`engineNow().milestones()`: read, never recomputed); the capability milestone has no engine crossing and says where
 * the build stands. Their criteria stay with their owners (TRANSITIONS, GOV_GATES), referenced here, not copied.
 */
export interface ProgrammeMilestone {
  id: string; kind: string; name: string; element: 'gateway' | 'milestone'; lane: LaneRole; phase: 'setup' | 'run'; criteria: string;
  /** product month of the engine crossing that places it (null: no crossing inside the horizon, or not placed by the engine) */
  month: number | null; placement: string;
}

const crossing = (c: Ctx, f: (m: { family: string; level?: string }) => boolean): number | null => {
  try { return engineNow(c).milestones().find(f)?.month ?? null; } catch { return null; }
};
const at = (m: number | null, what: string): string => (m === null ? `Not reached inside the horizon (${what})` : `Product month ${m}: ${what}`);

/** The milestones by kind and name, without placement (for the references of the context screens). */
export const MILESTONE_NAMES: readonly { kind: string; name: string }[] = [
  { kind: 'govGates', name: 'Governance gates in place' },
  ...TRANSITIONS.map(([t]) => ({ kind: `gate-${t.split('→')[1]!.trim()}`, name: `Maturity gate ${t}` })),
  { kind: 'capabilityTarget', name: 'Target capability reached' },
];

export function programmeMilestones(c: Ctx): ProgrammeMilestone[] {
  const gates = TRANSITIONS.map(([t, criteria]): ProgrammeMilestone => {
    const level = t.split('→')[1]!.trim(), month = crossing(c, (m) => m.family === 'maturity' && m.level === level);
    return { id: programmeActivityId('gate', level), kind: `gate-${level}`, name: `Maturity gate ${t}`, element: 'gateway', lane: 'designAuthority',
      phase: 'run',      criteria, month, placement: at(month, `the engine's crossing of ${level}`) };
  });
  const first = crossing(c, (m) => m.family === 'adoption'), k = capability(c);
  return [
    { id: programmeActivityId('govGates'), kind: 'govGates', name: 'Governance gates in place', element: 'milestone', lane: 'designAuthority',
      phase: 'run',      criteria: GOV_GATES.map(([g]) => g).join(' · '), month: first, placement: at(first, 'the engine\'s first adoption crossing') },
    ...gates,
    { id: programmeActivityId('capabilityTarget'), kind: 'capabilityTarget', name: 'Target capability reached', element: 'milestone', lane: 'preceptor',
      phase: 'setup',      criteria: `Operational capability at the target mass (${k.ops} of ${k.target}, ${k.pct}%; ${k.training} in training)`, month: null,
      placement: 'When the operational capability reaches the target mass (not placed by the engine)' },
  ];
}
