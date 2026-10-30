/** @calc-zone exports */
import type * as XL from 'exceljs';
import type { Portfolio } from '@/domain/portfolio';
import type { Doc } from '@/store/types';
import type { ThemeValues } from '@/domain/theme';
import { interpretParams } from '../params/reader';
import { withLegacyPatch } from '../../bpmn/legacy';
import type { ParamsEnv, ParamsScope, Sheets } from '../params/types';
import { buildParamsWorkbook } from '../params/writer';
import { PORTFOLIO_SHEETS } from './names';
import { readPortfolioSheets } from './read';
import { writePortfolioSheets } from './write';

export { PF_LIMITS, PF_SHEETS, PORTFOLIO_SHEETS } from './names';
export { isPortfolioWorkbook } from './read';

/**
 * The COMMON case as a document the existing sheet families understand: the common values plus a placeholder team (the first product's), which only
 * fills the legacy "Input Team" sheet. The real teams live in the TeamIn sheet and are never read from "Input Team" on a portfolio import.
 */
export const commonDocOf = (pf: Portfolio): Doc => ({ ...pf.common, teamIn: (pf.products[0] as { teamIn: Doc['teamIn'] }).teamIn }) as Doc;

/**
 * The parameters workbook of a portfolio: the 47 existing sheets describe the common case; "Export all" adds Products, Waves, TeamIn, Overrides,
 * KnowledgeSubsets, KnowledgeDomains and PortfolioSettings. The other scopes ('except Factory', 'persona config only') are the existing exports.
 */
export async function buildPortfolioParamsWorkbook(pf: Portfolio, scope: ParamsScope, env: ParamsEnv, print: Readonly<ThemeValues>): Promise<XL.Workbook> {
  const wb = await buildParamsWorkbook(commonDocOf(pf), scope, env, print);
  if (scope === 'all') writePortfolioSheets(wb, pf);
  return wb;
}

/**
 * Interpret a portfolio workbook against the current portfolio and return the portfolio the import would produce. The common sheets go through the
 * existing interpreter (same ranges and clamps) WITHOUT the legacy re-fit: a portfolio workbook states the stored values, which the next open re-fits
 * like any file. "Input Team" is ignored (TeamIn is authoritative). Throws `ParamsImportError`; nothing is written here.
 */
export function interpretPortfolioParams(sheets: Sheets, base: Portfolio, env: ParamsEnv): { next: Portfolio; notes: string[] } {
  const rest: Sheets = new Map([...sheets].filter(([name]) => !PORTFOLIO_SHEETS.has(name) && name !== 'Input Team'));
  const baseDoc = commonDocOf(base), { patch, notes } = interpretParams(rest, baseDoc, env);
  const common: Record<string, unknown> = withLegacyPatch(baseDoc as Record<string, unknown>, patch);   // scope sheets edit the process document
  delete common.teamIn;
  return { next: readPortfolioSheets(sheets, { ...base, common: common as Portfolio['common'] }), notes };
}
