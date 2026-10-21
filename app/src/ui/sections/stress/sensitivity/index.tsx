import { sensitivityMatrix, sensitivityRows } from '@/domain/stress';
import { useCaseResult, useCtx } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { SectionFrame } from '@/ui/zones/SectionFrame';

const help = (
  <>
    <p>Quantifies how much ROI and target headcount move when each key parameter changes — so you know which assumptions matter most.</p>
    <p>Each matrix cell = ROI recomputed for a given (automation %, glass ceiling %) pair. Steeper gradients mean higher sensitivity: those assumptions deserve the most validation effort.</p>
  </>
);
const TONE = { CRITICAL: 'brick', HIGH: 'amber', MEDIUM: 'teal', LOW: 'grey' } as const;

/** Sensitivity — the six key parameters and the automation × glass-ceiling ROI matrix. */
export default function SensitivitySection() {
  const c = useCtx(), rows = sensitivityRows(c), mx = sensitivityMatrix(c), end = useCaseResult().model.horizon;
  return (
    <SectionFrame title="Sensitivity" help={help}
      result={<>
        <p className="ac-muted">Impact of key parameters on ROI and target headcount. Recomputed for your configuration.</p>
        <DataTable rowKey={(r) => r.parameter} rows={rows} columns={[
          { key: 'p', header: 'Parameter', render: (r) => <strong>{r.parameter}</strong> }, { key: 'v', header: 'Value', align: 'center', render: (r) => r.value },
          { key: 'f', header: `Impact FTE Y${end}`, align: 'center', render: (r) => r.impactFte }, { key: 'r', header: 'ROI impact', align: 'center', render: (r) => r.roiImpact },
          { key: 's', header: 'Sensitivity', align: 'center', render: (r) => <Badge tone={TONE[r.level]}>{r.level}</Badge> },
        ]} />
        <Panel title="Automation × Glass ceiling matrix (ROI)">
          <div className="ac-table-wrap"><table className="ac-table">
            <thead><tr><th>Automation %</th>{mx.ceils.map((x) => <th key={x}>Glass {x}%</th>)}</tr></thead>
            <tbody>{mx.cells.map((row, i) => (
              <tr key={mx.autos[i]}><td><strong>{mx.autos[i]}%</strong></td>
                {row.map((cell, j) => <td key={mx.ceils[j]} style={{ background: cell.bg || undefined, textAlign: 'center', color: cell.roi == null ? '#999' : undefined }}>{cell.text}</td>)}</tr>))}
            </tbody></table></div>
        </Panel>
      </>} />
  );
}
