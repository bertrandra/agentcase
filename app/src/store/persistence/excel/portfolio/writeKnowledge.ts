import type * as XL from 'exceljs';
import { overrideRefs, overrideValue, type Portfolio } from '@/domain/portfolio';
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
  k.enabled !== undefined || k.targetCC !== undefined || k.curationFTE !== undefined || k.setupBase !== undefined || k.ktLeadMonths !== undefined || !!k.maturityAnswers;

/** Overrides, KnowledgeSubsets and KnowledgeDomains: one row per override (value as JSON), per product subset, per domain. */
export function writeKnowledge(wb: XL.Workbook, pf: Portfolio, make: MakeSheet, finish: Finish, inputs: Inputs): void {
  const ov = make(wb, PF_SHEETS.overrides, [16, 30, 8, 80]);
  for (const p of pf.products) {
    for (const ref of overrideRefs(p.overrides)) {
      chunks(JSON.stringify(overrideValue(p.overrides, ref))).forEach((part, i) => inputs(ov.addRow([p.id, ref, i + 1, part]), 4));
    }
  }
  finish(ov);
  const ks = make(wb, PF_SHEETS.subsets, [16, 10, 11, 12, 12, 14, ...Array<number>(9).fill(11)]);
  for (const p of pf.products.filter((x) => hasSubset(x.knowledge))) {
    const k = p.knowledge, a = k.maturityAnswers ?? [];
    inputs(ks.addRow([p.id, k.enabled === undefined ? '' : k.enabled ? 'Yes' : 'No', k.targetCC ?? '', k.curationFTE ?? '', k.setupBase ?? '', k.ktLeadMonths ?? '', ...Array.from({ length: 9 }, (_, i) => a[i] ?? '')]), 15);
  }
  finish(ks);
  const kd = make(wb, PF_SHEETS.domains, [16, 40, 10]);
  for (const p of pf.products) for (const d of p.knowledge.domains ?? []) inputs(kd.addRow([p.id, d.label, d.weightPct]), 3);
  finish(kd);
}
