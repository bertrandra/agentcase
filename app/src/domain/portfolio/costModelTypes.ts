/** @calc-zone exports */
/** What the cost-model workbook exports: a portfolio, one wave or one product. */
export type CostScope = { kind: 'portfolio' } | { kind: 'wave'; id: string } | { kind: 'product'; id: string };

/** How a row is displayed (number format) and what it measures. */
export type CostFmt = 'days' | 'pct' | 'eur' | 'rate' | 'fte' | 'factor';

/**
 * How a derived cell is recomputed by Excel. Row numbers are indexes into the rows of the table named (`Values`, `Rate cards`, `Other costs`) or of
 * the same table.
 */
export type CostFormula =
  | { k: 'sum'; rows: number[] }
  | { k: 'diff'; a: number; b: number }
  | { k: 'link'; row: number }
  | { k: 'dot'; values: [number, number]; rates: [number, number]; plus: number }
  | { k: 'adj'; days: number; mix: number }
  | { k: 'factor' };

export type CostRole = 'days' | 'info' | 'driver' | 'sub' | 'rate' | 'adjust' | 'teamcost' | 'engine' | 'diff' | 'line' | 'team' | 'total' | 'memo' | 'factor';

/** One line of a monthly table: keys, unit, t0 (AS-IS per month), the n portfolio months (null = empty cell) and the Total over the months. */
export interface CostRow {
  role: CostRole;
  /** Portfolio, Wave, Product, then the table's own key columns (7 in all) */
  keys: string[];
  unit: string;
  fmt: CostFmt;
  t0: number | null;
  months: (number | null)[];
  total: number | null;
  f?: CostFormula;
  /** a total line (product, wave, portfolio): shown in bold */
  bold?: boolean;
}

export interface CostTable { keyHeads: string[]; rows: CostRow[] }

export interface ParamRow { scope: string; product: string; name: string; value: number | string; unit: string; where: string }

export interface RateCardBlock { heads: string[]; rows: (string | number)[][] }

export interface CostModel {
  title: string;
  scopeLabel: string;
  currency: string;
  horizon: number;
  /** "M1", "M2"... with the date when the portfolio has a start date */
  monthLabels: string[];
  annualRate: number;
  /** products left out of the export (archived or without a wave) */
  excluded: string[];
  values: CostTable;
  rates: CostTable;
  other: CostTable;
  /** the day-rate table by location x grade band */
  rateCard: RateCardBlock;
  /** blended AS-IS / target day rate and target location mix by product; column index 5 is the delta used by the blending adjustment */
  mix: RateCardBlock;
  params: ParamRow[];
}
