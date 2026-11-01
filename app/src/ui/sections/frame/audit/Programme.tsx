import { PROGRAMME_AUDIT_IDS } from '@/controllers/audit';
import { PROGRAMME_ACTIVITIES, PROGRAMME_PHASES, programmeActivityId } from '@/domain/programme';
import type { AuditViewData } from '@/store/auditHooks';
import { ElementForm } from './ElementForm';
import { SelectCell } from './SelectCell';
import { useAuditView } from './view';

/**
 * The audit of the transformation programme's activities (SPEC_FIXES FX-21, F-B69): the same blocks as a delivery activity (tools, time,
 * quality, flow, people, pain points, evidence), kept in the case's document. Observed values never change a figure, and calibration does not
 * apply: the programme's parameters are edited in 📋 Programme.
 */
export function Programme({ data }: { data: AuditViewData }) {
  const selected = useAuditView((s) => s.selected), phase = new Map(PROGRAMME_PHASES.map((p) => [p.id, p.name]));
  const rows = PROGRAMME_ACTIVITIES.map((d) => ({ id: programmeActivityId(d.kind), name: d.name, phase: phase.get(d.phase) ?? d.phase }))
    .filter((r) => PROGRAMME_AUDIT_IDS.has(r.id));
  const sel = rows.find((r) => r.id === selected);
  return (
    <>
      <h2 id="ac-audit-prog-h">Programme activities</h2>
      <p className="ac-muted">Observations on the programme&apos;s own work (pilot, setup, rollout…). They are recorded like a delivery activity&apos;s;
        calibration does not apply to them.</p>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table" aria-labelledby="ac-audit-prog-h">
          <thead><tr><th scope="col">Activity</th><th scope="col">Phase</th><th scope="col">Audit</th></tr></thead>
          <tbody>{rows.map((r) => {
            const a = data.audit.elements.get(r.id), audited = !!a && a.observations.length + a.tools.length + a.painPoints.length + a.evidence.length > 0;
            return (
              <tr key={r.id}>
                <SelectCell id={r.id} selected={selected}>{r.name}</SelectCell>
                <td>{r.phase}</td><td>{audited ? 'Audited' : 'Not audited'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {sel && <ElementForm data={data} id={sel.id} title={`programme activity ${sel.name}`} blocks={['readiness', 'time', 'quality', 'flow', 'people']} />}
    </>
  );
}
