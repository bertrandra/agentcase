/** @calc-zone exports */
import { readPortfolioPlan, withoutPortfolioProcess, withPortfolioProcess, type PortfolioPlan } from '@/domain/portfolio/portfolioProcess';
import type { Portfolio } from '@/domain/portfolio';
import { serialize, type XDocument } from '@/domain/process';
import { parseBpmn } from './bpmn/read';

/**
 * Schema v6 (SPEC_FIXES FX-D14 (a)): a saved portfolio keeps its waves, setup capacity and products' knowledge subsets in its common BPMN
 * document, as the portfolio process (`domain/portfolio/portfolioProcess.ts`), not as JSON keys. `planIntoDocument` writes it before the file is
 * written (the keys leave the file); `planIntoJson` reads it back and removes it before the validators run (they see the keys as before), so the
 * portfolio in memory is unchanged. A file without the process (v5 and older) keeps its keys: nothing to do.
 */
type Rec = Record<string, unknown>;
const rec = (v: unknown): v is Rec => !!v && typeof v === 'object' && !Array.isArray(v);

/** The portfolio (store form: the common document a tree) with the plan written into its common document. */
export function planIntoDocument<T extends Pick<Portfolio, 'waves' | 'products' | 'maxConcurrentSetups'> & { common: { BPMN?: unknown } }>(pf: T): T {
  const d = pf.common.BPMN as XDocument | undefined;
  if (!d || d.kind !== 'document') return pf;
  return { ...pf, common: { ...pf.common, BPMN: withPortfolioProcess(d, pf) } };
}

/** The file JSON without the keys the plan holds (the waves, the capacity, each product's knowledge subset). */
export function withoutPlanKeys(file: Rec): Rec {
  const omit = (r: Rec, keys: readonly string[]): Rec => Object.fromEntries(Object.entries(r).filter(([k]) => !keys.includes(k)));
  const rest = omit(file, ['waves', 'maxConcurrentSetups']);
  return { ...rest, ...(Array.isArray(file.products) ? { products: file.products.map((p) => (rec(p) ? omit(p, ['knowledge']) : p)) } : {}) };
}

/** A raw portfolio file with its plan read back into the keys and the process removed from the common document's text (no plan: the same file). */
export function planIntoJson(raw: Rec): Rec {
  const common = raw.common, t = rec(common) ? common.BPMN : undefined;
  if (typeof t !== 'string' || !t.includes('PortfolioPlan')) return raw;
  const parsed = parseBpmn(t).doc;
  const plan: PortfolioPlan | null = parsed ? readPortfolioPlan(parsed) : null;
  if (!parsed || !plan) return raw;
  const products = Array.isArray(raw.products) ? raw.products.map((p) => (rec(p) && typeof p.id === 'string' ? { ...p, knowledge: plan.knowledge[p.id] ?? {} } : p))
    : raw.products;
  return { ...raw, common: { ...(common as Rec), BPMN: serialize(withoutPortfolioProcess(parsed)) }, products, waves: plan.waves,
    ...(plan.maxConcurrentSetups !== undefined ? { maxConcurrentSetups: plan.maxConcurrentSetups } : {}) };
}
