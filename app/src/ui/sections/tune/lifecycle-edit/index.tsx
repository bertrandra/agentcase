import { PHASES } from '@/domain';
import { resetLifecycleCoefficients } from '@/controllers/tuneB';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Callout, Panel } from '@/ui/widgets/cards';
import { MatrixTable } from './MatrixTable';

const help = (
  <>
    <p>The editable benchmark table behind the product-status axis: five product profiles × twelve phases, one coefficient per cell, plus one automation posture per profile.
      Position 0–100 on the status slider is interpolated across the five profiles; the same coefficients drive the Product-status weighting and the Eligibility potential matrix.</p>
    <p>artefact weight = raw effort × coefficient[profile][phase]; effective automation = … × autoPosture[profile]. These are benchmarks shared by every case: change them from measured data, not to flatter one case — per-case adjustments belong to the artefact effort values in Scope.</p>
  </>
);

/** Product profile & phase coefficients — the editable status × phase weight matrix and the automation posture. */
export default function LifecycleEditSection() {
  return (
    <SectionFrame title="📊 Product profile & phase coefficients" help={help}
      input={
        <>
          <Callout>This is the editable <strong>profile × phase coefficient matrix</strong> (v14.8): each product profile (Greenfield, Feature add,
            Maintenance, Modernisation — plus the End-of-life benchmark, which maps to Maintenance) carries one coefficient per phase, applied to the
            phase’s effort point. The same coefficients drive the Product-status weighting <em>and</em> the Eligibility potential matrix — one source
            of truth. Edit the per-phase coefficients and the automation posture for each profile. These are the benchmarks the lifecycle axis
            interpolates between — changes cascade live to the Scope catalogue, the cascade preview and the whole business case. Values are
            colour-coded: green &gt;1 (more effort/automation), red &lt;1 (less). Amber border = edited vs default.</Callout>
          <Panel title="Status × phase matrix">
            <MatrixTable />
            <div className="ac-form-row"><button type="button" onClick={resetLifecycleCoefficients}>↺ Reset all to defaults</button></div>
          </Panel>
        </>
      }
      diagnostic={
        <>
          <Panel title="Phase legend">
            <div className="ac-phases">
              {PHASES.map((p) => <div key={p.id}><strong>{p.id}</strong> {p.name} <span className="ac-muted">· {p.role}</span></div>)}
            </div>
          </Panel>
          <Callout>Weight = relative intensity of effort in that phase for that status (1.0 = baseline). Automation posture = multiplier on the
            effective automation depth at that status (how automatable the work is). Both are editable benchmarks — validate them against the client
            delivery profile.</Callout>
        </>
      } />
  );
}
