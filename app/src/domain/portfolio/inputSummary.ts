/** @calc-zone portfolio-consolidation */
import { khEnabled } from '../knowledge';
import { teamEtp } from './alloc';
import { overrideRefs } from './keys';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import { scheduledProducts } from './timeline';
import type { Portfolio } from './types';
import { scopeOf } from '../process/scope';

/** How a product runs the Knowledge Hub: not at all, as the common hub, or with its own subset. */
export type HubState = 'off' | 'common' | 'own subset';

/** What a product's inputs amount to, in a few counts (the generic aggregate view of an input section). */
export interface InputSummaryRow {
  id: string;
  name: string;
  wave: string;
  planned: boolean;
  archived: boolean;
  /** entry headcount (ETP) */
  etp: number;
  /** selected SDLC / regulatory artefacts of the effective case */
  artefacts: number;
  regArtefacts: number;
  /** override addresses the product holds (0 = it inherits every shareable value) */
  overrides: number;
  hub: HubState;
}

/** One summary line per requested product (unknown ids ignored), in the order asked, read from the product and its effective case (`resolveProduct`). */
export function inputSummary(pf: Portfolio, productIds: string[]): InputSummaryRow[] {
  const planned = new Set(scheduledProducts(pf).map((s) => s.product.id)), out: InputSummaryRow[] = [];
  for (const id of productIds) {
    const p = pf.products.find((x) => x.id === id);
    if (!p) continue;
    const c = resolveProduct(pf, id), own = Object.values(p.knowledge).some((v) => v !== undefined);
    out.push({
      id, name: p.name, wave: pf.waves.find((w) => w.id === p.waveId)?.name ?? '', planned: planned.has(id), archived: !!p.archived,
      etp: teamEtp(c.teamIn), artefacts: scopeOf(c).selectedArtefacts.length, regArtefacts: scopeOf(c).selectedRegArtefacts.length,
      overrides: overrideRefs(p.overrides).length,
      hub: !khEnabled(ctxOf(c)) ? 'off' : own ? 'own subset' : 'common',
    });
  }
  return out;
}
