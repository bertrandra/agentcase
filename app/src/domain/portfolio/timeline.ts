/** @calc-zone consolidation */
import { ktLead } from './subset';
import type { Portfolio, Product, Wave } from './types';

/** A planned product on the calendar. Calendar month T = month0 + t, where t = 1.. is the product's own Time Engine month. */
export interface Scheduled {
  product: Product;
  wave: Wave;
  /** wave start + product offset (0 = the portfolio's first month starts at T = 1) */
  month0: number;
  /** months the KT setup is placed before month0, bounded so it never falls before calendar month 1 */
  lead: number;
}

const whole = (x: number): number => (Number.isFinite(x) ? Math.max(0, Math.floor(x)) : 0);

export const productMonth0 = (wave: Wave, product: Product): number => whole(wave.startMonth) + whole(product.offsetMonths);

/** Planned products in portfolio order. Archived products and those without a wave (or with an unknown wave) are left out. */
export function scheduledProducts(pf: Portfolio): Scheduled[] {
  const out: Scheduled[] = [];
  for (const product of pf.products) {
    const wave = product.archived || product.waveId === null ? undefined : pf.waves.find((w) => w.id === product.waveId);
    if (!wave) continue;
    const month0 = productMonth0(wave, product);
    out.push({ product, wave, month0, lead: Math.min(ktLead(product.knowledge), month0) });
  }
  return out;
}

/** Ids of the products excluded from the consolidation, in portfolio order. */
export const unscheduledIds = (pf: Portfolio): string[] => {
  const planned = new Set(scheduledProducts(pf).map((s) => s.product.id));
  return pf.products.filter((p) => !planned.has(p.id)).map((p) => p.id);
};

/** Number of a product's own months that fit in the portfolio horizon (truncation). */
export const keptMonths = (horizon: number, month0: number, ownMonths: number): number => Math.max(0, Math.min(ownMonths, horizon - month0));

/** First calendar month (1-based) on which a planned product weighs on the cash: its month 1, or the first KT preparation month. */
export const firstActiveMonth = (s: Scheduled): number => s.month0 - s.lead + 1;
