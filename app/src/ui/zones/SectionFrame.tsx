import { useState } from 'react';
import { useViewProductId } from '@/store/productView';
import { ProductBanner } from '../widgets/ProductBanner';
import { ScopeBanner } from '../widgets/ScopeBanner';
import { EmbeddedFrame } from './EmbeddedFrame';
import type { FrameProps } from './frameProps';

/** The standard section layout (plan §5): header with help, then InputZone, ResultZone, DiagnosticZone. */
export function SectionFrame(props: FrameProps) {
  const { title, help, input, result, diagnostic, overrides } = props;
  const [showHelp, setShowHelp] = useState(false), pinned = useViewProductId();
  if (pinned) return <EmbeddedFrame {...props} />;   // a per-product render inside a aggregate view drill-down
  return (
    <article className="ac-section" aria-labelledby="ac-section-title">
      <div className="ac-section-head">
        <h1 id="ac-section-title">{title}</h1>
        {help && <button type="button" className="ac-help-btn" aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)} title="What does this section do?">?</button>}
      </div>
      {help && showHelp && <div className="ac-help" role="note">{help}</div>}
      <ScopeBanner />
      {overrides && <ProductBanner refs={overrides} />}
      {input && <section className="ac-zone ac-zone-input" aria-label="Inputs">{input}</section>}
      {result && <section className="ac-zone ac-zone-result" aria-label="Results">{result}</section>}
      {diagnostic && <section className="ac-zone ac-zone-diagnostic" aria-label="Checks">{diagnostic}</section>}
    </article>
  );
}
