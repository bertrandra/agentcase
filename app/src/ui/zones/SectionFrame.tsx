import { useState, type ReactNode } from 'react';
import { ProductBanner } from '../widgets/ProductBanner';

interface FrameProps {
  title: string; help?: ReactNode; input?: ReactNode; result?: ReactNode; diagnostic?: ReactNode;
  /** override addresses (`selectedArtefacts`, `values.engagementCtx`, ...) this section edits: with 2+ products a "Produit : X (hérité / n surcharges)" banner shows */
  overrides?: readonly string[];
}

/** The standard section layout (plan §5): header with help, then InputZone, ResultZone, DiagnosticZone. */
export function SectionFrame({ title, help, input, result, diagnostic, overrides }: FrameProps) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <article className="ac-section" aria-labelledby="ac-section-title">
      <div className="ac-section-head">
        <h1 id="ac-section-title">{title}</h1>
        {help && <button type="button" className="ac-help-btn" aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)} title="What does this section do?">?</button>}
      </div>
      {help && showHelp && <div className="ac-help" role="note">{help}</div>}
      {overrides && <ProductBanner refs={overrides} />}
      {input && <section className="ac-zone ac-zone-input" aria-label="Inputs">{input}</section>}
      {result && <section className="ac-zone ac-zone-result" aria-label="Results">{result}</section>}
      {diagnostic && <section className="ac-zone ac-zone-diagnostic" aria-label="Checks">{diagnostic}</section>}
    </article>
  );
}
