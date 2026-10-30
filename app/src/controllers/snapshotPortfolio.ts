/** @calc-zone exports */
import { resolveProduct, type Portfolio } from '@/domain/portfolio';
import { SNAPSHOT_KEY, type NamedSnapshot } from '@/domain/snapshots';
import { definePortfolioCommand } from '@/store/commands';
import { refitPortfolio } from '@/store/derive';
import { portfolioInFile } from '@/store/persistence/bpmn/caseFile';
import { readPortfolio } from '@/store/persistence/portfolioRead';
import { hasPortfolioContent } from '@/store/persistence/portfolioSnapshot';
import { keepTabView } from '@/store/persona';
import type { Doc, PortfolioDoc } from '@/store/types';

/**
 * The whole portfolio as a capture stores it (in its file form: process documents as XML text): structured clone without the view state (edit and
 * display scope) and without the library (so captures
 * never nest).
 * Only for real portfolios (`hasPortfolioContent`); a plain single case keeps the single-case capture, byte for byte.
 */
export function capturePortfolio(pf: PortfolioDoc): Record<string, unknown> | undefined {
  if (!hasPortfolioContent(pf)) return undefined;
  const { editScope: _e, displayScope: _d, persona: _p, ...rest } = structuredClone(portfolioInFile(pf));   // process documents as XML text
  void _e; void _d; void _p;
  const common = { ...rest.common } as Record<string, unknown>;
  delete common[SNAPSHOT_KEY];
  return { ...rest, common };
}

/**
 * The portfolio of a snapshot, validated like a file (hostile keys dropped, invariants enforced), with the CURRENT library put back and every
 * product's potential re-fitted.
 */
function restored(s: NamedSnapshot, library: unknown, current: PortfolioDoc): PortfolioDoc {
  const pf = refitPortfolio(readPortfolio(s.portfolio));
  const next: PortfolioDoc = { ...pf, common: { ...pf.common, [SNAPSHOT_KEY]: library } as Portfolio['common'] };
  // the user stays on the product they were on
  const keep = next.products.some((p) => p.id === current.activeProductId) ? current.activeProductId : next.activeProductId;
  return keepTabView(current, { ...next, activeProductId: keep });
}

interface Payload { name: string; snap: NamedSnapshot; library: unknown }
const activateCmd = definePortfolioCommand<Payload>({
  type: 'snapshots.activatePortfolio', label: (p) => `Activate snapshot "${p.name}"`, apply: (pf, p) => restored(p.snap, p.library, pf),
});
const baselineCmd = definePortfolioCommand<Payload>({
  type: 'snapshots.baselinePortfolio', label: (p) => `Set snapshot "${p.name}" as baseline`, apply: (pf, p) => restored(p.snap, p.library, pf),
});

/** Is the portfolio of this capture readable? (A hand-edited file may hold a damaged one: the activation is then refused instead of half applied.) */
export function readableCapture(s: NamedSnapshot): boolean {
  try { readPortfolio(s.portfolio); return true; } catch { return false; }
}
/** Activate (or set as baseline) a multi-product capture: the whole portfolio is replaced in ONE history step. */
export const activatePortfolio = (s: NamedSnapshot, library: unknown, baseline: boolean): ReturnType<typeof activateCmd> =>
  (baseline ? baselineCmd : activateCmd)({ name: s.name, snap: s, library });

/**
 * The case a snapshot gives the compare view: its active product (the one active NOW when the capture has it, else the one active at capture time), so
 * the comparison is always one product against the same product. A single-case capture is its stored case.
 */
export function compareCaseOf(s: NamedSnapshot, activeNow: string, fromState: (state: Record<string, unknown>) => Doc): Doc {
  if (!s.portfolio) return fromState(s.state);
  const pf = readPortfolio(s.portfolio);
  return resolveProduct(pf, pf.products.some((p) => p.id === activeNow) ? activeNow : pf.activeProductId) as Doc;
}
