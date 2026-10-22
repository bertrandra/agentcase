/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { makeCtx } from '@/domain';
import { fmtRoiPct } from '@/domain/economics';
import { resolveProduct, type Consolidated, type Portfolio, type Product } from '@/domain/portfolio';
import type { CaseState } from '@/domain/types/state';
import { resultsData } from '../data';
import { addCaseSheets, CASE_SHEET_NAMES } from '../index';
import { cardSheet, MONEY } from './blocks';

/** The names of one product's sheets: the summary and its six case sheets (prefixed "P<n> "), allocated up front so the order of the workbook is free. */
export interface ProductNames { summary: string; cases: Record<string, string> }
export const caseNameOf = (names: ProductNames) => (base: string): string => names.cases[base] ?? base;
export const CASE_KEYS: readonly string[] = CASE_SHEET_NAMES;

/**
 * "Product <name>": where the product sits in the portfolio (wave, calendar start, offset, KT lead) and its figures on the portfolio calendar, then its own
 * results sheets = today's results writer on the product's effective case (its own month 0, its own horizon). Both NPVs are shown (D-M4).
 */
export function productSheets(wb: Workbook, names: ProductNames, pf: Portfolio, c: Consolidated, prod: Product): void {
  const v = c.products.find((x) => x.id === prod.id), wave = pf.waves.find((w) => w.id === prod.waveId);
  const rows: [string, string | number | null, string?][] = [['Product', prod.name], ['Note', prod.note ?? ''], ['Wave', wave?.name ?? 'Not scheduled'], ['Offset in the wave (months)', prod.offsetMonths]];
  if (v) {
    const own = v.run.headline(), h = v.summary;
    rows.push(['Starts at calendar month', v.month0 + 1], ['KT preparation (months before start)', v.lead], ['NPV, calendar (EUR)', h.npv, MONEY], ['NPV from its own start (EUR)', own.npv, MONEY],
      ['ROI', fmtRoiPct(h.roi)], ['Total benefits', h.totalBenefit, MONEY], ['Setup investment', h.setup, MONEY], ['Net (benefits - setup)', h.net, MONEY], ['Payback (calendar month)', h.paybackMonth ?? 'not reached']);
  }
  cardSheet(wb.addWorksheet(names.summary), rows);
  const state: CaseState = resolveProduct(pf, prod.id);
  addCaseSheets(wb, resultsData(makeCtx(state)), undefined, caseNameOf(names));
}
