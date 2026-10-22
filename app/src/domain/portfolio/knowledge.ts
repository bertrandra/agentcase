import type { Ctx } from '../ctx';
import { CC_MULT, KT_RED } from '../catalog';
import { khRunAnnual, khSetupCost } from '../knowledge';
import { hubView } from '../tuneB/hub';
import { ctxOf } from './memo';
import { resolveProduct } from './resolve';
import { runOf } from './run';
import { ktLead } from './subset';
import { scheduledProducts } from './timeline';
import type { KnowledgeDomain, Portfolio } from './types';

export { subsetKeys, ktLead } from './subset';
export { infraShares as allocateInfra } from './resolve';
export { allocateCents } from './alloc';

const hubs = new WeakMap<Ctx, ReturnType<typeof hubView>>();
/** The with/without-hub comparison of a resolved case, computed once per case identity (it runs a second engine). */
function hubOf(ctx: Ctx): ReturnType<typeof hubView> {
  let h = hubs.get(ctx);
  if (!h) { h = hubView(ctx); hubs.set(ctx, h); }
  return h;
}

/** One line of the "Knowledge transfer" table (spec F29): the product's slice of the hub, with the existing hub figures. */
export interface KnowledgeRow {
  productId: string;
  name: string;
  waveId: string | null;
  /** calendar month the KT setup starts (month0 - lead + 1); null when the product is not planned */
  prepMonth: number | null;
  usesHub: boolean;
  /** the engagement context forbids the hub */
  locked: boolean;
  /** the requested target is above what the engagement context allows */
  capped: boolean;
  asisCC: number;
  targetCC: number;
  mult: number;
  domains: KnowledgeDomain[];
  /** months of KT preparation the product asks for (`ktLeadMonths`; the consolidation may cap it at month 0, see `prepMonth`) */
  lead: number;
  /** one-off KT setup cost (knowledge `khSetupCost`) */
  setup: number;
  /** yearly curation + infrastructure share (knowledge `khRunAnnual`) */
  annual: number;
  /** KT days avoided per year at the target level: entry ETP x 0.2 x 15 x KT_RED[CC] */
  ktDays: number;
  /** KT value avoided over the horizon (`hubView().kt`) */
  ktAvoided: number;
  /** extra savings over the horizon against the same product with the hub off (`hubView().dSav`) */
  hubDeltaSav: number;
}

export interface KnowledgeTable {
  rows: KnowledgeRow[];
  totals: { setup: number; annual: number; ktDays: number; ktAvoided: number; hubDeltaSav: number };
  /** hub effect (sum of `hubDeltaSav`) by wave id */
  byWave: Record<string, number>;
}

export function knowledgeRow(pf: Portfolio, productId: string): KnowledgeRow {
  const prod = pf.products.find((x) => x.id === productId)!, s = scheduledProducts(pf).find((x) => x.product.id === productId);
  const cs = resolveProduct(pf, productId), ctx = ctxOf(cs), run = runOf(cs), hv = hubOf(ctx), K = run.engine.K;
  return {
    productId, name: prod.name, waveId: prod.waveId, prepMonth: s ? s.month0 - (run.ktSetup > 0 ? s.lead : 0) + 1 : null,
    lead: ktLead(prod.knowledge), usesHub: hv.on, locked: hv.locked, capped: hv.clamped, asisCC: hv.asisCC, targetCC: hv.target, mult: hv.on ? (CC_MULT[hv.target] as number) : 1,
    domains: prod.knowledge.domains ?? [], setup: khSetupCost(ctx), annual: khRunAnnual(ctx, K.dayRateTarget, K.wdMonth * 12),
    ktDays: hv.on ? run.baseEtp * 0.2 * 15 * (KT_RED[Math.max(0, Math.min(4, hv.target))] || 0) : 0, ktAvoided: hv.kt, hubDeltaSav: hv.dSav,
  };
}

export type KnowledgeTotals = KnowledgeTable['totals'];

/** Sum of the additive columns of some rows (the whole table, or a wave filter of it). */
export function knowledgeTotals(rows: KnowledgeRow[]): KnowledgeTotals {
  const sum = (f: (r: KnowledgeRow) => number) => rows.reduce((a, r) => a + f(r), 0);
  return { setup: sum((r) => r.setup), annual: sum((r) => r.annual), ktDays: sum((r) => r.ktDays), ktAvoided: sum((r) => r.ktAvoided), hubDeltaSav: sum((r) => r.hubDeltaSav) };
}

export function knowledgeTable(pf: Portfolio): KnowledgeTable {
  const rows = pf.products.filter((p) => !p.archived).map((p) => knowledgeRow(pf, p.id)), byWave: Record<string, number> = {};
  for (const r of rows) if (r.waveId !== null) byWave[r.waveId] = (byWave[r.waveId] ?? 0) + r.hubDeltaSav;
  return { rows, totals: knowledgeTotals(rows), byWave };
}
