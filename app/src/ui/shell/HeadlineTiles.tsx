import { fmtEurK, fmtMonths, fmtPct } from '../format';
import { fmt1 } from '../economicsFormat';
import { Kpi } from './Kpi';

/** The figures of the nine headline tiles: a product's (case result) or a Portfolio / Wave's (consolidated headline). */
export interface HeadlineFigures {
  fte: { before: number; after: number }; year: number; savings: number; run: number; cr: { years: number; ok: boolean; net: number };
  /** Velocity uplift: `raw` sets the sign, `shown` is the number displayed. */
  velocity: { raw: number; shown: number }; payback: number | null; eff: number; ceiling: number;
}
export type TileTitles = Record<'fteBefore' | 'fteAfter' | 'savings' | 'run' | 'saving' | 'velocity' | 'payback' | 'eff' | 'ceiling', string>;

/** The nine headline tiles, same labels, values and tones for every scope; only the tooltips (`titles`) say whose figures they are. */
export function HeadlineTiles({ f, titles }: { f: HeadlineFigures; titles: TileTitles }) {
  const e = f.year, cr = f.cr;
  return (
    <>
      <Kpi label="FTE before" value={fmt1(f.fte.before)} tone="blue" title={titles.fteBefore} />
      <Kpi label={`FTE after Y${e}`} value={fmt1(f.fte.after)} tone="teal" title={titles.fteAfter} />
      <Kpi label={`Savings Y${e}`} value={fmtEurK(f.savings)} tone="teal" title={titles.savings} />
      <Kpi label={`Run cost Y${e}`} value={fmtEurK(f.run)} tone="amber" title={titles.run} />
      <Kpi label={`Saving over ${cr.years} yr`} value={cr.ok ? fmtPct(cr.net * 100) : 'n/a'} tone={cr.ok && cr.net < 0 ? 'brick' : 'teal'}
        title={titles.saving} />
      <Kpi label={`Velocity Y${e}`} value={`${f.velocity.raw >= 0 ? '+' : ''}${f.velocity.shown}%`} tone="teal" title={titles.velocity} />
      <Kpi label="Payback" value={fmtMonths(f.payback)} tone="blue" title={titles.payback} />
      <Kpi label="Effective automation" value={fmtPct(f.eff)} tone="teal" title={titles.eff} />
      <Kpi label="Glass ceiling" value={fmtPct(f.ceiling)} tone="brick" title={titles.ceiling} />
    </>
  );
}
