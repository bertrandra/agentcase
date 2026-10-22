/** @calc-zone exports */
import type { CostFormula } from '@/domain/portfolio';
import { FIRST } from './layout';

/** Where the single cells a formula needs live: the first row of the blending-mix table (Rate cards) and the annual-discount-rate parameter (Other costs). */
export interface Anchors { mixStart: number; rateRow: number }

/** "J11:J15,J20": consecutive rows collapse into ranges. */
function refs(c: string, rows: number[]): string {
  const sorted = [...rows].sort((a, b) => a - b), out: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === (sorted[j] as number) + 1) j++;
    out.push(j > i ? `${c}${FIRST + (sorted[i] as number)}:${c}${FIRST + (sorted[j] as number)}` : `${c}${FIRST + (sorted[i] as number)}`);
    i = j + 1;
  }
  return out.join(',');
}

const span = ([a, b]: [number, number]): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** The Excel formula (without "=") of a derived cell of column `c`; `n` is the month number (0 for t0). Row numbers are table indexes. */
export function formulaText(f: CostFormula, c: string, n: number, a: Anchors): string {
  switch (f.k) {
    case 'sum': return `SUM(${refs(c, f.rows)})`;
    case 'diff': return `${c}${FIRST + f.a}-${c}${FIRST + f.b}`;
    case 'link': return `'Rate cards'!${c}${FIRST + f.row}`;
    case 'dot': return `SUMPRODUCT(Values!${refs(c, span(f.values))},${refs(c, span(f.rates))})+${c}${FIRST + f.plus}`;
    case 'adj': return `Values!${c}${FIRST + f.days}*$F$${a.mixStart + f.mix}`;
    case 'factor': return `1/(1+$F$${a.rateRow}/12)^${n}`;
  }
}
