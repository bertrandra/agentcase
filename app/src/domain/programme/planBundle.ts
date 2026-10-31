/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import type { OrgModel } from '../org/types';
import type { Consolidated } from '../portfolio/consolidate';
import { opModelCompute } from '../tune/opmodel';
import { programmeHistogram, type ProgrammeHistogram } from './histogram';
import { deliveryHistogram, type DeliveryHistogram } from './histogramDelivery';
import { portfolioHistogram, type SetupFlag } from './histogramPortfolio';
import { programmeLaneId } from './ids';
import { PROGRAMME_LANES } from './lanes';
import type { ProgrammeLane } from './model';
import { programmeObs, type ObsNode } from './obs';
import { casePlan, portfolioPlan, type Plan } from './plan';
import { programmeRam, type Ram } from './ram';
import { programmeWbs, type WbsNode } from './wbs';
import { wbsDictionary, type DictionaryRow } from './wbsDictionary';

/**
 * Every project view of the programme for one display scope (docs/SPEC_BPMN.md § 19.8 F-B73…F-B77; phase B9d): the plan (Gantt bars),
 * WBS, WBS dictionary, OBS, RAM and the resource histograms, read by the 📅 Plan screen, the results workbook's plan sheets, the plan report
 * and the MS Project export, so every surface shows the same view.
 */
export type PlanScope = { kind: 'product' } | { kind: 'portfolio' } | { kind: 'wave'; id: string } | { kind: 'unit'; id: string; name: string };
export interface PlanViews {
  scope: PlanScope; plan: Plan; wbs: WbsNode[]; dictionary: DictionaryRow[]; obs: ObsNode[]; ram: Ram; lanes: ProgrammeLane[];
  histogram: ProgrammeHistogram; setupFlags: SetupFlag[];
  /** the delivery view (engine FTE before / after per role): the Product scope only */
  delivery: DeliveryHistogram | null;
}
export interface PlanSource {
  /** the shown case (the active product, or the single case) and its name */
  c: Ctx; name: string; org: OrgModel; scope: PlanScope;
  /** the consolidation, for the Wave, Unit and Portfolio scopes, and the transformation team's capacity (`maxConcurrentSetups`) */
  k?: Consolidated; capacity?: number | null; productId?: string;
  /**
   * a Wave or a Unit (F-B81): its planned products, as the one owner of a selection gives them (`groupOf(k, scope).items`, read by the caller so
   * the delivery views do not depend on the consolidation zone); the Portfolio takes every planned product
   */
  ids?: readonly string[];
}

/** The programme's lanes with each role's Y1 FTE (EV-09 topology). */
export function programmeLanes(c: Ctx): ProgrammeLane[] {
  const topo = (() => { try { return opModelCompute(c, 0); } catch { return null; } })();
  return PROGRAMME_LANES.map((l) => ({ id: programmeLaneId(l.role), role: l.role, name: l.name, description: l.description,
    fteY1: topo && l.topology ? topo[l.topology] : null }));
}

export function planViews(s: PlanSource): PlanViews {
  const wide = s.scope.kind !== 'product' && s.k ? s.k : null, only = s.scope.kind === 'wave' || s.scope.kind === 'unit' ? s.ids ?? [] : undefined;
  const plan = wide ? portfolioPlan(s.c, wide, only) : casePlan(s.c, s.name, s.productId);
  const wbs = programmeWbs(plan), lanes = programmeLanes(s.c);
  const h = wide ? portfolioHistogram(wide, s.capacity ?? null, only) : null;
  return {
    scope: s.scope, plan, wbs, dictionary: wbsDictionary(plan, wbs), obs: programmeObs(s.org, lanes),
    ram: programmeRam(wbs, lanes), lanes, histogram: h ?? programmeHistogram(s.c), setupFlags: h?.setupFlags ?? [],
    delivery: wide ? null : deliveryHistogram(s.c),
  };
}
