/** @calc-zone exports */
import type * as XL from 'exceljs';
import { overrideRefs, overrideValue, type Portfolio } from '@/domain/portfolio';
import { BPMN_KEY, scopeOf, type XDocument } from '@/domain/process';
import { PF_LIMITS, PF_SHEETS } from './names';

type MakeSheet = (wb: XL.Workbook, name: string, widths: number[]) => XL.Worksheet;
type Finish = (w: XL.Worksheet) => void;
type Inputs = (row: XL.Row, n: number) => void;

/** A JSON text cut into cells below the per-cell cap of the import (a long list of artefacts must not be truncated silently). */
export const chunks = (json: string): string[] => {
  const out: string[] = [];
  for (let i = 0; i < json.length; i += PF_LIMITS.chunkChars) out.push(json.slice(i, i + PF_LIMITS.chunkChars));
  return out.length ? out : [''];
};

const hasSubset = (k: Portfolio['products'][number]['knowledge']): boolean =>
  k.enabled !== undefined || k.targetCC !== undefined || k.curationFTE !== undefined || k.setupBase !== undefined || k.ktLeadMonths !== undefined
    || !!k.maturityAnswers;

/**
 * The rows of a product's overrides: one per key or form field; a process document override (whole document, F-B20) is written as the version 2
 * scope keys derived from it (`scopeOf`), one row each, which this build and older ones read back.
 */
function overrideRows(o: Portfolio['products'][number]['overrides']): [string, unknown][] {
  return overrideRefs(o).flatMap((ref): [string, unknown][] => (ref !== BPMN_KEY ? [[ref, overrideValue(o, ref)]]
    : Object.entries(scopeOf({ BPMN: o.BPMN as XDocument })).filter(([, v]) => v !== undefined)));
}

/** Overrides, KnowledgeSubsets and KnowledgeDomains: one row per override (value as JSON), per product subset, per domain. */
export function writeKnowledge(wb: XL.Workbook, pf: Portfolio, make: MakeSheet, finish: Finish, inputs: Inputs): void {
  const ov = make(wb, PF_SHEETS.overrides, [16, 30, 8, 80]);
  for (const p of pf.products) {
    for (const [ref, value] of overrideRows(p.overrides)) chunks(JSON.stringify(value)).forEach((part, i) => inputs(ov.addRow([p.id, ref, i + 1, part]), 4));
  }
  finish(ov);
  const ks = make(wb, PF_SHEETS.subsets, [16, 10, 11, 12, 12, 14, ...Array<number>(9).fill(11)]);
  for (const p of pf.products.filter((x) => hasSubset(x.knowledge))) {
    const k = p.knowledge, a = k.maturityAnswers ?? [];
    inputs(ks.addRow([p.id, k.enabled === undefined ? '' : k.enabled ? 'Yes' : 'No', k.targetCC ?? '', k.curationFTE ?? '', k.setupBase ?? '',
      k.ktLeadMonths ?? '', ...Array.from({ length: 9 }, (_, i) => a[i] ?? '')]), 15);
  }
  finish(ks);
  const kd = make(wb, PF_SHEETS.domains, [16, 40, 10]);
  for (const p of pf.products) for (const d of p.knowledge.domains ?? []) inputs(kd.addRow([p.id, d.label, d.weightPct]), 3);
  finish(kd);
}
