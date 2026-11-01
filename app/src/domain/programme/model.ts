/** @calc-zone exports */
import type { Ctx } from '../ctx';
import { hriEnabled } from '../engagement';
import { khEnabled } from '../knowledge';
import { laneRolesOf } from '../org/laneRoles';
import type { XDocument } from '../process/xml';
import { capacityOf, dependencyLabel, scheduledProducts, waveSchedule, type Portfolio } from '../portfolio';
import { opModelCompute } from '../tune/opmodel';
import { PROGRAMME_ACTIVITIES, PROGRAMME_PHASES, type ParamDef, type ProgrammeActivityDef, type ProgrammePhase } from './catalogue';
import { activityDescription } from './activityMeta';
import { activityCost, type ActivityCost } from './costs';
import { activityType, type CostProfile } from './costProfile';
import { DELIVERY_PARTICIPANT_ID, PROGRAMME_PARTICIPANT_ID, programmeActivityId, programmeLaneId, programmePhaseId } from './ids';
import { PROGRAMME_LANES, type LaneRole } from './lanes';
import { placementOf, type Placement } from './placement';
import { programmeMilestones, type ProgrammeMilestone } from './milestones';
import { wbsOverride } from './wbs';

/**
 * The transformation programme as a process (docs/SPEC_BPMN.md § 19.4 F-B64–F-B67, F-B69; phase B9a): a second participant "Transformation
 * programme" beside the delivery process, DERIVED in memory from the catalogue (descriptions, lanes, RACI, parameters) and today's keys (values),
 * like the B6b teams — nothing is stored, no figure moves. Lanes per operating-model role (agents in their own lane), phases as sub-processes,
 * per-product activities multi-instance over the products of their wave, waves as sub-processes with their dependency and the transformation-team
 * capacity, message flows to the delivery process.
 */
export interface ParamValue { def: ParamDef; value: string }
export interface ProgrammeActivity extends ProgrammeActivityDef {
  id: string;
  /** false when the activity's module is off (hub, readiness): drawn like an out-of-scope activity, its parameters still editable */
  active: boolean;
  values: ParamValue[]; placement: Placement; cost: ActivityCost;
  /** how its cost is laid on the months (`ac:costProfile`, B9e) */
  costProfile: CostProfile;
  /** per-product activity: multi-instance over this many products (1 in a single-product case) */
  instances: number | null;
  /** the WBS code override entered for it (`ac:wbsCode`, § 19.8 F-B74; phase B9d), when any */
  wbsCode?: string;
}
export interface ProgrammeLane {
  id: string; role: LaneRole; name: string; description: string; fteY1: number | null;
  /** FX-D11: the organisation role (resource id) mapped to this operating-model role, when any */
  orgRole?: string;
}
export interface ProgrammeWave { id: string; name: string; products: string[]; start: number; dependency: string | null }
export interface ProgrammeMessageFlow { id: string; name: string; source: string; target: string }
export interface ProgrammeView {
  participant: { id: string; name: string }; deliveryParticipant: string;
  lanes: ProgrammeLane[]; phases: { id: string; phase: ProgrammePhase; name: string }[]; activities: ProgrammeActivity[];
  waves: ProgrammeWave[];
  /** the milestones and gateways (maturity gates, governance gates, target capability), placed by the engine's crossings, per product */
  milestones: (ProgrammeMilestone & { instances: number })[];
  /** at most this many products in setup at once (the transformation team's capacity on its lanes); null = no limit */
  capacity: number | null;
  messageFlows: ProgrammeMessageFlow[];
}


const valueOf = (c: Ctx, d: ParamDef, knowledge: Record<string, unknown> | undefined): string =>
  (d.store === 'knowledge' ? String(knowledge?.[d.key] ?? 0) : c.inp.v(d.key));
function wavesOf(pf: Portfolio | undefined): ProgrammeWave[] {
  if (!pf || pf.waves.length === 0) return [];
  const plan = waveSchedule(pf), names = new Map(pf.products.map((p) => [p.id, p.name])), sched = scheduledProducts(pf);
  return pf.waves.map((w) => ({ id: `prog-wave-${w.id}`, name: w.name, start: plan.starts.get(w.id) ?? w.startMonth, dependency: dependencyLabel(pf, w),
    products: sched.filter((s) => s.wave.id === w.id).map((s) => names.get(s.product.id) ?? s.product.id) }));
}
const MODULE_ON = { khEnabled, hriEnabled } as const;

/** The programme process of a case (`pf`: its portfolio, for the waves, the products and the knowledge subset of the product shown). */
export function programmeProcess(c: Ctx, pf?: Portfolio, productId?: string): ProgrammeView {
  const topo = (() => { try { return opModelCompute(c, 0); } catch { return null; } })(), waves = wavesOf(pf);
  const planned = pf ? pf.products.filter((p) => !p.archived && p.waveId !== null).length : 1;
  const knowledge = pf?.products.find((p) => p.id === (productId ?? pf.activeProductId))?.knowledge as Record<string, unknown> | undefined;
  const activities = PROGRAMME_ACTIVITIES.map((d): ProgrammeActivity => ({
    ...d, id: programmeActivityId(d.kind), description: activityDescription(c, d), active: d.module ? MODULE_ON[d.module](c) : true,
    costProfile: activityType(c, d.kind).profile,
    values: d.params.map((p) => ({ def: p, value: valueOf(c, p, knowledge) })), placement: placementOf(c, d, pf, productId), cost: activityCost(c, d),
    instances: d.level === 'product' ? Math.max(1, planned) : null, ...(wbsOverride(c, d.kind) ? { wbsCode: wbsOverride(c, d.kind)! } : {}),
  }));
  const hub = activities.find((a) => a.kind === 'hubSetup')?.active ?? false, act = (k: string) => programmeActivityId(k);
  const mapped = laneRolesOf(pf?.common.BPMN as XDocument | undefined);   // FX-D11
  const messageFlows: ProgrammeMessageFlow[] = [
    { id: 'prog-mf-agents', name: hub ? 'Hub ready → agents enabled' : 'Platform ready → agents enabled', source: act(hub ? 'hubSetup' : 'setupTooling'),
      target: DELIVERY_PARTICIPANT_ID },
    ...(hub ? [{ id: 'prog-mf-wave', name: 'Knowledge transfer done → the product\'s wave starts', source: act('ktPrep'),
      target: DELIVERY_PARTICIPANT_ID }] : []),
    { id: 'prog-mf-scale', name: 'Pilot decision → scale', source: act('stage-decide'), target: DELIVERY_PARTICIPANT_ID },
  ];
  return {
    participant: { id: PROGRAMME_PARTICIPANT_ID, name: 'Transformation programme' }, deliveryParticipant: DELIVERY_PARTICIPANT_ID,
    lanes: PROGRAMME_LANES.map((l) => ({ id: programmeLaneId(l.role), role: l.role, name: l.name, description: l.description,
      fteY1: topo && l.topology ? topo[l.topology] : null, ...(mapped.get(l.role) ? { orgRole: mapped.get(l.role)! } : {}) })),
    phases: PROGRAMME_PHASES.map((p) => ({ id: programmePhaseId(p.id), phase: p.id, name: p.name })), activities, waves,
    milestones: programmeMilestones(c).map((m) => ({ ...m, instances: Math.max(1, planned) })),
    capacity: pf ? capacityOf(pf) : null, messageFlows,
  };
}
