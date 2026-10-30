/** @calc-zone aggregate-views */
import { catalogueProcess } from '../process/defaultProcess';
import { readProcess } from '../process/read';
import { base, productCases, type AggBase } from './aggScopeRows';
import type { Portfolio } from './types';

/**
 * Section "🧩 Process (BPMN)" (phase B4), aggregate view: each product's process in counts — its activities, those marked in scope, those not in the
 * default catalogue (custom or imported), its actors, and whether the product overrides the common process (F-B20). Counts only, no figure.
 */
export interface ProcessRow extends AggBase { activities: number; inScope: number; custom: number; actors: number; own: boolean }
export interface ProcessAgg { rows: ProcessRow[]; own: number; custom: number }

export function scopeProcess(pf: Portfolio, ids: string[]): ProcessAgg {
  const known = new Set(readProcess(catalogueProcess()).activities.map((a) => a.id));
  const rows = productCases(pf, ids).map((p) => {
    const v = readProcess(p.c.BPMN);
    return { ...base(p), activities: v.activities.length, inScope: v.activities.filter((a) => a.inScope !== false).length,
      custom: v.activities.filter((a) => !known.has(a.id)).length, actors: v.actors.length, own: p.overridden('BPMN') };
  });
  return { rows, own: rows.filter((r) => r.own).length, custom: rows.filter((r) => r.custom > 0).length };
}
