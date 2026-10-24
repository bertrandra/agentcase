import { createContext, useContext, useId } from 'react';
import { useInCommonView } from '@/store/commonEditHooks';
import { useActiveProduct } from '@/store/portfolioHooks';
import type { FrameProps } from './frameProps';

/** Heading level of an embedded section title: 4 under a drill-down item (h2 > h3 > h4), 3 under the in-place editor (h2 > h3). */
export const EmbedLevel = createContext<3 | 4>(4);

/**
 * A section frame rendered INSIDE a per-product view (`ProductViewContext`: the drill-down of a aggregate view, or the in-place editor): the same three
 * zones, but no page title (the host owns the h1), no help, no scope banner, and zone labels that name the product (or "All products" for the common
 * values) so landmarks stay unique when several products are open.
 */
export function EmbeddedFrame({ title, input, result, diagnostic }: FrameProps) {
  const id = useId(), name = useActiveProduct().name, who = useInCommonView() ? 'All products' : name, H = useContext(EmbedLevel) === 3 ? 'h3' : 'h4';
  return (
    <article className="ac-section ac-section-embedded" aria-labelledby={id}>
      <H id={id} className="ac-embedded-title">{title}</H>
      {input && <section className="ac-zone ac-zone-input" aria-label={`Inputs — ${who}`}>{input}</section>}
      {result && <section className="ac-zone ac-zone-result" aria-label={`Results — ${who}`}>{result}</section>}
      {diagnostic && <section className="ac-zone ac-zone-diagnostic" aria-label={`Checks — ${who}`}>{diagnostic}</section>}
    </article>
  );
}
