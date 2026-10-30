import { countBySeverity, type OrgDiagnostic } from '@/domain/org';

const SHOWN = 30;

/** F-B36 / F-B37 diagnostics, inline and never silent: errors and warnings listed, information counted (and listed on demand). */
export function Diagnostics({ ds }: { ds: OrgDiagnostic[] }) {
  const n = countBySeverity(ds), loud = ds.filter((d) => d.severity !== 'info'), info = ds.filter((d) => d.severity === 'info');
  return (
    <div>
      <h2>RACI and staffing checks</h2>
      <p aria-live="polite" data-org-status="">{n.error} error{n.error === 1 ? '' : 's'} · {n.warning} warning{n.warning === 1 ? '' : 's'} · {n.info} to
        confirm or for information</p>
      {loud.length > 0 && (
        <ul>{loud.slice(0, SHOWN).map((d, i) => <li key={i}><strong>{d.severity === 'error' ? 'Error' : 'Warning'}</strong> — {d.message}</li>)}
          {loud.length > SHOWN && <li>… and {loud.length - SHOWN} more</li>}</ul>
      )}
      {info.length > 0 && (
        <details>
          <summary>Information ({info.length}): Accountable to confirm, agent activities without a human Accountable</summary>
          <ul>{info.slice(0, SHOWN).map((d, i) => <li key={i}>{d.message}</li>)}{info.length > SHOWN && <li>… and {info.length - SHOWN} more</li>}</ul>
        </details>
      )}
    </div>
  );
}
