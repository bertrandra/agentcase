import { useId } from 'react';
import { useActiveProduct } from '@/store/portfolioHooks';
import type { FrameProps } from './frameProps';

/**
 * A section frame rendered INSIDE a per-product view (`ProductViewContext`, the drill-down of a aggregate view): the same three zones, but no page title
 * (the host owns the h1), no help, no scope banner, and zone labels that name the product so landmarks stay unique when several products are open.
 */
export function EmbeddedFrame({ title, input, result, diagnostic }: FrameProps) {
  const id = useId(), who = useActiveProduct().name;
  return (
    <article className="ac-section ac-section-embedded" aria-labelledby={id}>
      <h4 id={id} className="ac-embedded-title">{title}</h4>
      {input && <section className="ac-zone ac-zone-input" aria-label={`Inputs — ${who}`}>{input}</section>}
      {result && <section className="ac-zone ac-zone-result" aria-label={`Results — ${who}`}>{result}</section>}
      {diagnostic && <section className="ac-zone ac-zone-diagnostic" aria-label={`Checks — ${who}`}>{diagnostic}</section>}
    </article>
  );
}
