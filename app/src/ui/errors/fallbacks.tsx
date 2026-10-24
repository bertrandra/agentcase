import { useEffect, useId, useState } from 'react';
import { errorDetails, type CaughtError } from './errorLog';
import { cssVars, px } from '../cssVars';
import '../theme/errors.css';

/** "Copy details": the error text to the clipboard; where the clipboard is blocked, the details stay readable (and selectable) below. */
export function CopyDetails({ error }: { error: CaughtError }) {
  const [status, setStatus] = useState(''), id = useId(), text = errorDetails(error);
  const copy = () => {
    const done = () => setStatus('Details copied.'), failed = () => setStatus('Copy is blocked here: select the details below.');
    try { void navigator.clipboard.writeText(text).then(done, failed); } catch { failed(); }
  };
  return (
    <>
      <button type="button" onClick={copy} aria-describedby={id}>Copy details</button>
      <span className="ac-error-status" role="status">{status}</span>
      <details className="ac-error-details"><summary>Details</summary><pre id={id} tabIndex={0}>{text}</pre></details>
    </>
  );
}

/** The whole shell failed: a minimal page that does not depend on the store or the theme runtime. */
export function AppFallback({ error, onShown }: { error: CaughtError; onShown?: () => void }) {
  useEffect(() => { onShown?.(); }, [onShown]);
  return (
    <main className="ac-error ac-error-app" aria-labelledby="ac-app-error">
      <h1 id="ac-app-error">AgentCase hit an unexpected error</h1>
      <p>Your case is autosaved in this browser as you edit it (when the browser allows storage): after a reload, AgentCase offers to restore it.</p>
      <div className="ac-error-actions">
        <button type="button" onClick={() => window.location.reload()}>Reload</button>
        <CopyDetails error={error} />
      </div>
    </main>
  );
}

/** The section in the work area failed; the menu, the KPI bar and every other section keep working. */
export function SectionFallback({ error, retry }: { error: CaughtError; retry: () => void }) {
  return (
    <section className="ac-error" role="alert" aria-labelledby="ac-section-error">
      <h1 id="ac-section-error">This section failed to display</h1>
      <p>The rest of AgentCase keeps working and your case is unchanged. Try again, or open another section.</p>
      <div className="ac-error-actions">
        <button type="button" onClick={retry}>Try again</button>
        <CopyDetails error={error} />
      </div>
    </section>
  );
}

/** One chart failed: its place keeps its height, the figures and tables of the section are unaffected. */
export function ChartFallback({ label, height }: { label: string; height: number }) {
  return (
    <div className="ac-chart ac-error-chart" style={cssVars({ '--ac-chart-h': px(height) })} role="note">{/* dynamic: the failed chart's own height */}
      The chart “{label}” could not be drawn. The figures around it are unaffected.
    </div>
  );
}
