/** @calc-zone product-resolution */
import { current } from 'immer';
import { makeCtx, phaseScopeOf } from '@/domain';
import { autoCapFrom } from '@/domain/inputs';
import { resolveProduct, setCommon, setOverride, type Portfolio } from '@/domain/portfolio';
import type { Doc } from './types';

/** Technical cap on the automation potential (autoCapPct input, 10..100). */
export function autoTechCap(d: Doc): number {
  return autoCapFrom(d.dom.values.autoCapPct);
}

/** The potential the scope fit gives a case (legacy applyScopeAuto), or null when "Fit to selected scope" is off. */
export function fitTarget(d: Doc): string | null {
  if (!d.dom.checked.fitAuto) return null;
  const sc = phaseScopeOf(makeCtx(d));
  return String(Math.max(0, Math.min(autoTechCap(d), Math.round(sc.avgAgent))));
}

/** Fit-to-scope: when `fitAuto` is on, the potential follows the scope's effort-weighted automatable share (legacy applyScopeAuto). */
export function refitPotential(draft: Doc): void {
  const t = fitTarget(current(draft) as Doc);
  if (t !== null) draft.dom.values.autoPotential = t;
}

const REF = 'values.autoPotential';

/**
 * Re-fit on open for a whole portfolio: every product's potential follows ITS effective scope. A product that already overrides the potential
 * keeps an override; the others share the most frequent value as the common one and only the products that differ get an override. A product
 * whose fit is off keeps its present value (pinned by an override if the common one moved). With one product this is `refitPotential`.
 */
export function refitPortfolio<T extends Portfolio>(pf: T): T {
  const items = pf.products.map((p) => {
    const eff = resolveProduct(pf, p.id) as unknown as Doc, t = fitTarget(eff) ?? eff.dom.values.autoPotential;
    return { id: p.id, t, own: p.overrides.dom?.values?.autoPotential !== undefined };
  });
  const shared = items.filter((x) => !x.own && x.t !== undefined), count = new Map<string, number>();
  for (const x of shared) count.set(x.t as string, (count.get(x.t as string) ?? 0) + 1);
  const common = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  let out: Portfolio = pf;
  if (common !== undefined && common !== pf.common.dom.values.autoPotential) out = setCommon(out, REF, common);
  for (const x of items) {
    if (x.t === undefined || (!x.own && x.t === common)) continue;
    const have = out.products.find((p) => p.id === x.id)?.overrides.dom?.values?.autoPotential;
    if (have !== x.t) out = setOverride(out, x.id, REF, x.t);
  }
  return out as T;
}
