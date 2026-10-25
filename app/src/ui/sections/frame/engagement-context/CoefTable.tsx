import { setEngageCoef } from '@/controllers/frame';
import { ENGAGE_COEF } from '@/domain/frame';
import { useDoc } from '@/store/hooks';
import { CommitNumber } from '@/ui/widgets/CommitNumber';
import { OverrideBadge } from '@/ui/widgets/OverrideBadge';

const FIELDS: [string, string][] = [
  ['rampSpeed', 'Ramp speed ×'], ['rampCapPct', 'Ramp cap %'], ['glassFactor', 'Glass factor ×'], ['setupBillable', 'Setup billable ×'],
  ['riskPremium', 'Risk premium pts'], ['maturityCap', 'Maturity cap L'], ['authorityCap', 'Authority cap A'], ['khMaxCC', 'Hub max CC'],
  ['mcWiden', 'MC widen ×'],
];
type Row = Record<string, number>;

/** The nine coefficients of the three engagement contexts; edited cells are flagged against the referential defaults. */
export function CoefTable() {
  const coef = useDoc((d) => d.engageCoef) as unknown as Record<string, Row>;
  const defaults = ENGAGE_COEF as unknown as Record<string, Row>;
  const keys = Object.keys(coef);
  return (
    <details>
      <summary>Context coefficients (editable)</summary>
      <OverrideBadge refKey="engageCoef" label="Context coefficients" />
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table ac-coef-table">
          <thead><tr><th scope="col">Coefficient</th>{keys.map((k) => <th key={k} scope="col" className="ac-th-c">{k}</th>)}</tr></thead>
          <tbody>
            {FIELDS.map(([f, label]) => (
              <tr key={f}><td>{label}</td>
                {keys.map((k) => {
                  const cur = (coef[k] as Row)[f] as number, edited = Math.abs(cur - ((defaults[k] as Row | undefined)?.[f] ?? cur)) > 1e-9;
                  return (
                    <td key={k} className="ac-c">
                      <CommitNumber value={String(cur)} label={`${label} of ${k}`} step={0.05} onCommit={(v) => setEngageCoef(k, f, parseFloat(v))}
                        className={edited ? 'ac-coef-input is-edited' : 'ac-coef-input'} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ac-muted">Defaults follow the referential’s three engagement contexts. Edited cells are amber. Persisted in HTML snapshots.</p>
    </details>
  );
}
