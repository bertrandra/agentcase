import type { ReactNode } from 'react';
import type { Spread } from '@/domain/portfolio';
import { useCorePortfolio } from '@/store/consolidationHooks';
import { useViewScope } from '@/store/viewScope';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';

/** "min – max" of a measure over the selection, as the domain computed it (formatting only). */
export const fmtRange = (s: Spread | null, digits = 0, unit = ''): string => (s ? (s.min === s.max ? `${s.min.toFixed(digits)}${unit}` : `${s.min.toFixed(digits)}${unit} – ${s.max.toFixed(digits)}${unit}`) : '—');

/** Products of the selection left out of the figures (unscheduled or archived), named. Nothing when none. */
export function ExcludedNote() {
  const vs = useViewScope(), core = useCorePortfolio();
  if (!vs.excludedIds.length) return null;
  const names = vs.excludedIds.map((id) => core.products.find((p) => p.id === id)?.name ?? id);
  return <Callout kind="blue">Excluded from the figures (no wave, or archived): {names.join(', ')}.</Callout>;
}

/** The shell of an aggregate input view: the section's title and help, a read-only note, then the section's tables. */
export function InputAggregate({ title, help, intro, children, result }: { title: string; help?: ReactNode; intro: string; children: ReactNode; result?: ReactNode }) {
  return (
    <SectionFrame title={title} help={help}
      input={
        <>
          <Callout kind="blue">Summary, read-only: {intro} Edit it in place below (the choice of “Change” in the top bar), or “Edit this product” to view that product.</Callout>
          {children}
          <ExcludedNote />
        </>
      }
      result={result} />
  );
}
