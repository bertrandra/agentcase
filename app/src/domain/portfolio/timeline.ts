/** @calc-zone portfolio-consolidation */
import { resolveProduct } from './resolve';
import { runOf } from './run';
import { ktPrepMonths, setupMonths } from '../programme/timing';
import type { Portfolio, Product, Wave } from './types';
import { resolveSchedule, whole, type WaveSchedule } from './waveSchedule';

/** A planned product on the calendar. Calendar month T = month0 + t, where t = 1.. is the product's own Time Engine month. */
export interface Scheduled {
  product: Product;
  wave: Wave;
  /** effective wave start + product offset, pushed back by the capacity (0 = the portfolio's first month starts at T = 1); see `waveSchedule` */
  month0: number;
  /** months the KT setup is placed before month0, bounded so it never falls before calendar month 1 */
  lead: number;
}

/** Own (planned) month 0 of a product: its wave's own start + offset, before any dependency or capacity. */
export const productMonth0 = (wave: Wave, product: Product): number => whole(wave.startMonth) + whole(product.offsetMonths);

const schedules = new WeakMap<Portfolio, WaveSchedule>();
/**
 * The effective calendar (wave dependencies, transformation-team capacity), once per portfolio identity. A product's setup lasts what the
 * programme's timing owner says (`setupMonths`, the setup duration: SPEC_BPMN § 19.4 F-B65, D-B27).
 */
export function waveSchedule(pf: Portfolio): WaveSchedule {
  let s = schedules.get(pf);
  if (!s) { s = resolveSchedule(pf, (id) => setupMonths(runOf(resolveProduct(pf, id)).ctx)); schedules.set(pf, s); }
  return s;
}

/** Planned products in portfolio order. Archived products and those without a wave (or with an unknown wave) are left out. */
export function scheduledProducts(pf: Portfolio): Scheduled[] {
  const out: Scheduled[] = [], plan = waveSchedule(pf);
  for (const product of pf.products) {
    const wave = product.archived || product.waveId === null ? undefined : pf.waves.find((w) => w.id === product.waveId);
    if (!wave) continue;
    const month0 = plan.month0.get(product.id) ?? productMonth0(wave, product);
    out.push({ product, wave, month0, lead: Math.min(ktPrepMonths(product.knowledge), month0) });
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
