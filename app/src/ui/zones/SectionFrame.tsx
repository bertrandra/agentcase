import { useState, type ReactNode } from 'react';

interface FrameProps { title: string; help?: ReactNode; input?: ReactNode; result?: ReactNode; diagnostic?: ReactNode }

/** The standard section layout (plan §5): header with help, then InputZone, ResultZone, DiagnosticZone. */
export function SectionFrame({ title, help, input, result, diagnostic }: FrameProps) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <article className="ac-section" aria-labelledby="ac-section-title">
      <div className="ac-section-head">
        <h1 id="ac-section-title">{title}</h1>
        {help && <button type="button" className="ac-help-btn" aria-expanded={showHelp} onClick={() => setShowHelp(!showHelp)} title="What does this section do?">?</button>}
      </div>
      {help && showHelp && <div className="ac-help" role="note">{help}</div>}
      {input && <section className="ac-zone ac-zone-input" aria-label="Inputs">{input}</section>}
      {result && <section className="ac-zone ac-zone-result" aria-label="Results">{result}</section>}
      {diagnostic && <section className="ac-zone ac-zone-diagnostic" aria-label="Checks">{diagnostic}</section>}
    </article>
  );
}
