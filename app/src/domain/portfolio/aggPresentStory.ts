/** @calc-zone aggregate-views */
import { model } from '../model/overlay';
import { storySummary, type Story } from '../pdc/story';
import { selectionOf, total } from './aggEconomicsSel';
import type { Consolidated } from './consolidate';
import type { DisplayScope } from './portfolioHeadline';
import { selectionView } from './selectionView';
import type { Portfolio } from './types';
import type { ProductView } from './waves';

/** The story of a selection, with the fields of a product's `Story` (calendar years: Year 1 starts with the portfolio). */
export interface SelectionStory { baseFte: number; tgtFte: number; velocityPct: number; baselineRun: number; endRun: number; endSavings: number;
  paybackMonth: number | null; years: number; endLabel: string }
export interface StoryRow extends Story { id: string; name: string; wave: string }
export interface StoryAgg { label: string; story: SelectionStory; rows: StoryRow[]; excluded: { id: string; name: string; archived: boolean }[] }

const rowOf = (pf: Portfolio, v: ProductView): StoryRow => ({ id: v.id, name: v.name, wave: pf.waves.find((w) => w.id === v.waveId)?.name ?? '',
  ...storySummary(v.run.ctx) });

/**
 * The story so far of a Portfolio / Wave: team, run cost and delivery from AS-IS to TO-BE, read from the selection's headline (headcount, velocity weighted by
 * entry headcount, last calendar year savings and run, payback of the consolidated cash) and the sum of the products' yearly baseline cost; one story
 * per product below.
 */
export function aggregateStory(pf: Portfolio, c: Consolidated, scope: DisplayScope): StoryAgg | null {
  const sel = selectionOf(c, scope);
  if (!sel) return null;
  const h = sel.headline, years = h.years.net.length;
  return {
    label: sel.label, excluded: selectionView(pf, c, scope)?.excluded ?? [], rows: sel.items.map((v) => rowOf(pf, v)),
    story: { baseFte: h.fte.before, tgtFte: h.fte.after, velocityPct: h.velocityPct, baselineRun: total(sel.items.map((v) => model(v.run.ctx).baselineRun)),
      endRun: h.endYear.run, endSavings: h.endYear.savings, paybackMonth: h.paybackMonth, years, endLabel: `Year ${years}` },
  };
}
