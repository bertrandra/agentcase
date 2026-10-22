import { useHasPortfolioContent } from '@/store/portfolioHooks';
import { Callout } from '@/ui/widgets/cards';

/** What a portfolio adds to each export. Shown only when the work is a real portfolio (2+ products or waves, an override or a knowledge subset): a plain case sees nothing new. */
function Note({ title, items }: { title: string; items: string[] }) {
  return (
    <Callout kind="blue">
      <strong>{title}</strong>
      <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
    </Callout>
  );
}

/** Settings tab: the sheets "Export all" adds to the parameters workbook. */
export function ParamsNote() {
  if (!useHasPortfolioContent()) return null;
  return (
    <Note title="Portfolio: what the parameters workbook contains" items={[
      'The usual sheets describe the common case (shared defaults).',
      '"Export all" adds, to the parameters workbook: PortfolioSettings (hub, horizon, start date), Products, Waves, TeamIn (one team per product, a Product column), Overrides (product, key, JSON value), KnowledgeSubsets and KnowledgeDomains.',
      '"Export all except Factory" and "Export persona config only" stay as they are, without the portfolio sheets.',
      'Importing a workbook with a Products sheet replaces the whole portfolio in one undoable step; a problem in any row refuses the file and leaves the case untouched.',
    ]} />
  );
}

/** Results tab: the sheets of the portfolio results workbook. */
export function ResultsNote() {
  if (!useHasPortfolioContent()) return null;
  return (
    <Note title="Portfolio: what the results workbook contains" items={[
      'Portfolio: headline, by year, by wave, by product and the calendar NPV.',
      'One sheet per wave (cumulative cash by month) and Knowledge transfer.',
      'Per product: a summary sheet and its own six results sheets (ROI to Workforce shift, prefixed P1, P2, ...).',
      'The display scope chooses which sheets come first; every sheet is always exported. Chart pictures are not embedded.',
    ]} />
  );
}
