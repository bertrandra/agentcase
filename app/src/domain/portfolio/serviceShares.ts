/** @calc-zone product-resolution */
import { artTeamSkill, skillMapOf } from '../baseline/skills';
import type { WArtefact } from '../artefacts';
import { readRaci } from '../org/readRaci';
import { readStoredOrg } from '../org/readUnits';
import { effortOf, effortSplit, lineUnit, serviceActivities, serviceDefs, type ServiceActivity, type ServiceDef } from '../org/services';
import { orgExtOf } from '../org/orgExt';
import type { XDocument } from '../process/xml';
import { activeArtefacts } from '../scope';
import type { CaseState } from '../types/state';
import { mergeCase } from './layers';
import { ctxOf, memoChain } from './memo';
import { processCommon, sharedLines } from './teamAccess';
import type { Portfolio, Product, SharedTeamLine } from './types';

/**
 * The split of the shared lines across products (docs/SPEC_BPMN.md § 21 F-B82, D-B38; phase B10c). A line of a shared-service unit marked
 * `split: 'effort'` gives each product the share of the service's effort for it (what `org/services.ts` assigns: pins, activity types, RACI
 * Responsible roles); every other line gives its fixed shares (`allocations`: the override, and the only rule of the lines written before B10c, so
 * every existing figure is unchanged). The effort is read on each product's PROCESS case (its process, scope and parameters, no team): a team
 * edit never moves a share, and the share never depends on the team it feeds (no cycle). Memoised.
 */
type WithCommon = Pick<Portfolio, 'common' | 'products' | 'hub'>;
const NO_TEAM: CaseState['teamIn'] = [], NO_ORG = {}, processRoots = new WeakMap<object, unknown>(), roots = new WeakMap<object, unknown>();

/** A product's case without any team (the effort of its activities does not depend on the team). Memoised on its process and values. */
function processCase(pf: WithCommon, prod: Product): CaseState {
  const common = processCommon(pf.common);
  return memoChain(processRoots, [common, prod.overrides, prod.knowledge], `${pf.hub.enabled}|${pf.hub.infraMonthly}`,
    () => mergeCase(common, prod, NO_TEAM, pf.hub.enabled, pf.hub.infraMonthly));
}

/** What one service does for one product: the activities, their effort, and the product's whole scope weight. */
export interface ServiceProduct { productId: string; activities: ServiceActivity[]; effort: number; scopeEffort: number }
export interface ServiceDelivery { def: ServiceDef; products: ServiceProduct[]; split: Record<string, number> }

/** The services of a portfolio and what each delivers to each kept product (archived products are served nothing), in portfolio order. Memoised. */
export function serviceDeliveries(pf: WithCommon): ServiceDelivery[] {
  const d = pf.common.BPMN as XDocument | undefined, ext = orgExtOf(d) ?? NO_ORG;
  return memoChain(roots, [processCommon(pf.common), pf.products, ext], `${pf.hub.enabled}|${pf.hub.infraMonthly}`, () => {
    const defs = serviceDefs(d?.root ? readStoredOrg(d).units : [], sharedLines(pf));
    if (!defs.length) return [];
    const kept = pf.products.filter((p) => !p.archived).map((p) => {
      const c = ctxOf(processCase(pf, p)), active = activeArtefacts(c.a, c.s), scope = active.reduce((t, a) => t + (+a.w || 0), 0);
      const map = skillMapOf(c.s), teamSkill = (a: { id: string }): string => artTeamSkill(a as WArtefact, map);
      return { p, work: { active, teamSkill, raci: c.s.BPMN ? readRaci(c.s.BPMN) : [] }, scope };
    });
    return defs.map((def): ServiceDelivery => {
      const products = kept.map(({ p, work, scope }): ServiceProduct => {
        const activities = serviceActivities(def, work);
        return { productId: p.id, activities, effort: effortOf(activities), scopeEffort: scope };
      });
      return { def, products, split: effortSplit(new Map(products.map((x) => [x.productId, x.effort]))) };
    });
  });
}

/** How a line is split: by the effort of its service (D-B38 a) or by its fixed shares (the override, and every line outside a service). */
export function lineRule(pf: WithCommon, l: SharedTeamLine): 'effort' | 'fixed' {
  if (l.split !== 'effort') return 'fixed';
  return serviceDeliveries(pf).some((s) => s.def.id === lineUnit(l)) ? 'effort' : 'fixed';
}

/** The share (percent) of a line each product gets, as the figures read it: the effort split of its service, or its fixed shares. */
export function lineShares(pf: WithCommon, l: SharedTeamLine): Record<string, number> {
  if (l.split !== 'effort') return l.allocations;
  const s = serviceDeliveries(pf).find((x) => x.def.id === lineUnit(l));
  return s ? s.split : l.allocations;
}

const EMPTY: ReadonlyMap<string, Record<string, number>> = new Map(), shareRoots = new WeakMap<object, unknown>();
/** The shares of the lines split by effort (line id → percent per product); the same empty map when no line is (every case before B10c). */
export function effortLineShares(pf: WithCommon): ReadonlyMap<string, Record<string, number>> {
  const lines = sharedLines(pf);
  if (!lines.some((l) => l.split === 'effort')) return EMPTY;
  const ds = serviceDeliveries(pf);
  return memoChain(shareRoots, [lines, ds], 'shares', () => new Map(lines.filter((l) => lineRule(pf, l) === 'effort').map((l) => [l.id, lineShares(pf, l)])));
}
