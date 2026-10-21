import { setEngageCoef } from '@/controllers/frame';
import { ENGAGE_COEF } from '@/domain/frame';
import { useDoc } from '@/store/hooks';
import { CommitNumber } from '@/ui/widgets/CommitNumber';

const FIELDS: [string, string][] = [
  ['rampSpeed', 'Ramp speed ×'], ['rampCapPct', 'Ramp cap %'], ['glassFactor', 'Glass factor ×'], ['setupBillable', 'Setup billable ×'], ['riskPremium', 'Risk premium pts'],
  ['maturityCap', 'Maturity cap L'], ['authorityCap', 'Authority cap A'], ['khMaxCC', 'Hub max CC'], ['mcWiden', 'MC widen ×'],
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
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table" style={{ maxWidth: 560 }}>
          <thead><tr><th scope="col">Coefficient</th>{keys.map((k) => <th key={k} scope="col" style={{ textAlign: 'center' }}>{k}</th>)}</tr></thead>
          <tbody>
            {FIELDS.map(([f, label]) => (
              <tr key={f}><td>{label}</td>
                {keys.map((k) => {
                  const cur = (coef[k] as Row)[f] as number, edited = Math.abs(cur - ((defaults[k] as Row | undefined)?.[f] ?? cur)) > 1e-9;
                  return (
                    <td key={k} style={{ textAlign: 'center' }}>
                      <CommitNumber value={String(cur)} label={`${label} of ${k}`} step={0.05} style={{ width: 64, textAlign: 'center', borderColor: edited ? '#b04600' : undefined }}
                        onCommit={(v) => setEngageCoef(k, f, parseFloat(v))} />
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
