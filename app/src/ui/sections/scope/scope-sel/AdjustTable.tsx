import { useState } from 'react';
import { phasesForScope } from '@/domain';
import { resetAgent, resetEffort, setAgentSup, setEffort, setPhaseAgent } from '@/controllers/artefacts';
import { useCtx } from '@/store/hooks';
import { Badge } from '@/ui/widgets/cards';
import { openActivity } from '@/ui/widgets/ActivityRefs';
import { AdjustLive } from './AdjustLive';
import { adjustRows } from './adjust';

/** Editable % auto and effort weight per artefact (blue = % auto overridden, amber = effort overridden); its id opens it in the Process section. */
export function AdjustTable() {
  const c = useCtx(), [phase, setPhase] = useState('ALL'), [bulk, setBulk] = useState('100');
  const rows = adjustRows(c, phase);
  /** The effective weight is teal / brick when the product-status lifecycle weight raises / lowers it, muted otherwise. */
  const wTone = (lw: number) => (c.s.lifecycleUse && Math.abs(lw - 1) > 0.001 ? (lw > 1 ? 'teal' : 'brick') : 'muted');
  return (
    <details className="ac-panel">
      <summary><h2 className="ac-summary-title">🎚️ Adjust % auto &amp; effort weight per artifact</h2>
        {' '}<small className="ac-muted">— full catalogue, filtered by phase</small></summary>
      <div className="ac-form-row">
        <label className="ac-field"><span className="ac-field-l">Filter by phase</span>
          <select value={phase} onChange={(e) => setPhase(e.target.value)}>
            <option value="ALL">All phases</option>{phasesForScope().map((p) => <option key={p.id} value={p.id}>{p.id} {p.name}</option>)}
          </select></label>
        <button type="button" onClick={resetAgent} title="Restore default % auto">↺ Reset % auto</button>
        <button type="button" onClick={resetEffort} title="Restore default effort weights">↺ Reset effort weights</button>
        {phase !== 'ALL' && (
          <span className="ac-form-row">Set all in-scope artefacts of <strong>{phase}</strong> to
            <input type="number" aria-label="Bulk % auto" min={0} max={100} value={bulk} onChange={(e) => setBulk(e.target.value)}
              className="ac-adjust-bulk" /> % auto
            <button type="button" onClick={() => setPhaseAgent(phase, bulk)}>Apply</button></span>
        )}
      </div>
      <AdjustLive />
      <p className="ac-muted">The <strong>% auto</strong> (automatable %, human supervision = 100 − this) and <strong>Effort weight</strong> columns are
        editable. Blue = % auto overridden, amber = effort overridden.</p>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr>
            <th>ID</th><th>Artifact</th><th>Phase</th><th>Value</th><th>Skill</th><th>AI authorization</th><th>Human sup.</th><th>% auto (agent)</th>
            <th>Effort weight</th><th title="Base effort weight × the current product-status lifecycle weight">Effective (lifecycle)</th>
          </tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className={a.isReg ? 'is-reg' : ''}>
                <td><button type="button" className="ac-link" onClick={() => openActivity(a.id)} aria-label={`Open ${a.id} ${a.name} in Process`}
                  title="Open in Process"><strong>{a.id}</strong></button></td><td>{a.name}{a.isReg && <small> · {a.norm}</small>}</td><td>{a.phase}</td>
                <td>{a.isReg ? <Badge tone="amber">REG</Badge> : <Badge>{a.value}</Badge>}</td><td>{a.skill}</td><td>{a.aiAuth}</td>
                <td className="ac-c ac-muted">{a.humanSup}%</td>
                <td className="ac-c"><input type="number" min={0} max={100} aria-label={`% auto of ${a.id}`} value={a.agentSup}
                  onChange={(e) => setAgentSup(a.id, e.target.value)}
                  className="ac-adjust-input" data-tone={a.agentSup !== a.defaultAuto ? 'blue' : undefined} title={`Default ${a.defaultAuto}%`} /></td>
                <td className="ac-c"><input type="number" min={0} step={0.5} aria-label={`Effort of ${a.id}`} value={a.effort}
                  onChange={(e) => setEffort(a.id, e.target.value)}
                  className="ac-adjust-input" data-tone={a.effort !== a.defaultEffort ? 'amber' : undefined} title={`Default ${a.defaultEffort}`} /></td>
                <td className="ac-c ac-tone" data-tone={wTone(a.lifecycle)}>{a.w.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
