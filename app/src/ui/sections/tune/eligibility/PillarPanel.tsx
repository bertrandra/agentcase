import { PRODUCT_PROFILES, PROFILE_PHASES, currentProfileId, leverColor, leverWord, pillarApplyOn, profileById, profileCoef } from '@/domain/tune';
import { setLifecyclePos } from '@/controllers/lifecycle';
import { useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { CheckInput, Field } from '@/ui/widgets/fields';
import { Note } from '@/ui/widgets/tuneA';

/** EV-13 use-case pillar x SDLC potential: the product profile (shared with the product-status axis) against the 12 phases. */
export function PillarPanel() {
  const c = useCtx(), cur = currentProfileId(c.s.lifecyclePos);
  return (
    <Panel title="Use-case pillar × SDLC potential" aside={<><Badge>= product profile × 12 phases</Badge> <Badge tone="blue">EV-13</Badge></>}>
      <div className="ac-form-row">
        <Field label="Product profile" hint="(shared with Product status)">
          <select value={cur} onChange={(e) => setLifecyclePos(profileById(e.target.value).pos)}>
            {PRODUCT_PROFILES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </Field>
        <CheckInput id="pillarApply" label="Apply pillar leverage to the Abaque reconciliation" />
      </div>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr><th>Profile \ Phase</th>{PROFILE_PHASES.map((ph) => <th key={ph} className="ac-c" title={ph}>{ph === 'Cross-cutting' ? 'X' : ph}</th>)}</tr></thead>
          <tbody>
            {PRODUCT_PROFILES.map((pr) => (
              <tr key={pr.id} style={pr.id === cur ? { background: 'var(--ac-bg)' } : undefined}>
                <td style={{ fontWeight: pr.id === cur ? 'var(--ac-font-weight-bold)' : 'var(--ac-font-weight-semibold)' }}>{pr.label}{pr.id === cur ? ' ◀' : ''}</td>
                {PROFILE_PHASES.map((ph) => {
                  const x = profileCoef(c, pr.id, ph);
                  return <td key={ph} className="ac-c" style={{ color: leverColor(x), fontWeight: pr.id === cur ? 'var(--ac-font-weight-bold)' : 'var(--ac-font-weight-regular)' }}>{leverWord(x)}<br /><small className="ac-muted">({x.toFixed(2)})</small></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Note>Reference 1.2 potential matrix (Strong / Medium / Cautious). It tells <em>where</em> to deploy agents first. {pillarApplyOn(c)
        ? <>Leverage is <strong>applied</strong> to the Abaque reconciliation below.</> : 'Analytical only — tick the box above to apply it to the Abaque reconciliation.'}</Note>
    </Panel>
  );
}
