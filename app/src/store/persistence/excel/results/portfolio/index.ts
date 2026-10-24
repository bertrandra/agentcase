/** @calc-zone exports */
import type { Workbook } from 'exceljs';
import { consolidate, consolidationView, corePortfolio, type DisplayScope, type Portfolio } from '@/domain/portfolio';
import type { ExcelJS } from '../../lazy';
import { withPrint } from '../../print';
import type { ThemeValues } from '@/domain/theme';
import { CASE_KEYS, productSheets, type ProductNames } from './productSheet';
import { ktSheet } from './ktSheet';
import { sheetName } from './names';
import { portfolioSheet } from './portfolioSheet';
import { stressSheet, type StressExtra } from './stressSheet';
import { waveSheet } from './waveSheet';

export { sheetName } from './names';
export type { StressExtra } from './stressSheet';

interface Part { key: string; add: () => void }

/**
 * The results workbook of a portfolio: "Portfolio", one "Wave <name>" per wave, "Knowledge transfer", then per kept product "Product <name>" followed by
 * that product's own six results sheets (prefixed "P<n> "). All of them are always exported; the display scope only decides which group LEADS the
 * workbook (the portfolio, one wave, or one product). When a portfolio Monte Carlo has been run, "Portfolio stress" follows "Knowledge transfer". Names obey Excel's rules (31 characters, no []:*?/\, unique). Numbers come from `consolidate`,
 * `portfolioHeadline`, `consolidationView` and `knowledgeTable` only; the product sheets are the single-case results writer on the effective case.
 */
export function buildPortfolioResultsWorkbook(xl: ExcelJS, source: Portfolio, print: Readonly<ThemeValues>, scope: DisplayScope = { kind: 'portfolio' }, productId: string = source.activeProductId, stress: StressExtra | null = null): Workbook {
  const pf = corePortfolio(source), c = consolidate(pf), view = consolidationView(pf, c), used = new Set<string>();
  const wb = withPrint(new xl.Workbook(), print);
  wb.creator = 'AgentCase'; wb.created = new Date();
  const names = { pf: sheetName('Portfolio', used), kt: '' };
  const waveNames = new Map(pf.waves.map((w) => [w.id, sheetName(`Wave ${w.name}`, used)]));
  names.kt = sheetName('Knowledge transfer', used);
  const stressName = stress ? sheetName('Portfolio stress', used) : '';
  const kept = pf.products.filter((p) => !p.archived);
  const prodNames = new Map<string, ProductNames>(kept.map((p, i) => {
    const summary = sheetName(`Product ${p.name}`, used);
    return [p.id, { summary, cases: Object.fromEntries(CASE_KEYS.map((k) => [k, sheetName(`P${i + 1} ${k}`, used)])) }];
  }));
  const parts: Part[] = [
    { key: 'portfolio', add: () => portfolioSheet(wb, names.pf, view, c.horizon) },
    ...pf.waves.map((w): Part => ({ key: `wave:${w.id}`, add: () => waveSheet(wb, waveNames.get(w.id) as string, c, view, w.id) })),
    { key: 'kt', add: () => ktSheet(wb, names.kt, pf) },
    ...(stress ? [{ key: 'stress', add: () => stressSheet(wb, stressName, pf, stress) }] : []),
    ...kept.map((p): Part => ({ key: `product:${p.id}`, add: () => productSheets(wb, prodNames.get(p.id) as ProductNames, pf, c, p) })),
  ];
  const lead = scope.kind === 'wave' ? `wave:${scope.id}` : scope.kind === 'product' ? `product:${productId}` : 'portfolio';
  [...parts.filter((p) => p.key === lead), ...parts.filter((p) => p.key !== lead)].forEach((p) => p.add());
  return wb;
}
