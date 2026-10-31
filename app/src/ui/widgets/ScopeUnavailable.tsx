/**
 * "Not available at this scope" (docs/SPEC_BPMN.md § 21, F-B81): a figure the Unit scope does not define yet — the Monte Carlo distribution and
 * the probabilistic verdict of a unit come with the strategy per unit (D-B40). The consolidated figures of the unit stay shown around it.
 */
export function ScopeUnavailable({ what, label }: { what: string; label: string }) {
  return (
    <p className="ac-muted" data-scope-unavailable="unit">
      <em>{what} of {label}: not available at the unit scope yet (the Monte Carlo verdict per unit comes with the strategy per unit). Show the Portfolio
        or a Wave for it.</em>
    </p>
  );
}
