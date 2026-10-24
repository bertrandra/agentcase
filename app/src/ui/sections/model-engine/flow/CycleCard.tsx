import { setFlowCycleTime, setFlowWip } from '@/controllers/modelFlow';
import type { flowModel } from '@/domain/model/flow';
import { flowOf } from '@/domain/model/modelState';
import { useCtx } from '@/store/hooks';
import { NumField } from '@/ui/widgets/CommitField';
import { Badge, Panel } from '@/ui/widgets/cards';
import { Tile } from '../shared';

/** Cycle time and WIP, always visible (they need no sponsor input), with the measured overrides. */
export function CycleCard({ fm }: { fm: ReturnType<typeof flowModel> }) {
  const flow = flowOf(useCtx().s.MODEL);
  return (
    <Panel title="Cycle time & WIP - Little's Law" aside={<small className="ac-muted">always visible, needs no sponsor input</small>}>
      <div className="ac-stat-row">
        <Tile label="AS-IS lead time" value={`${fm.ctAsis.toFixed(1)}d`} />
        <Tile label="New lead time derived" tone="teal" value={<>{fm.ctNew.toFixed(1)}d <Badge tone={fm.ctSource === 'measured' ? 'teal' : 'blue'}>{fm.ctSource}</Badge></>} />
        <Tile label="Compression Θ" tone="purple" value={`${(fm.theta * 100).toFixed(0)}%`} />
        <Tile label="WIP (Little's Law)" tone="amber" value={fm.wip.toFixed(1)} note={fm.wipMeasured != null ? `measured: ${fm.wipMeasured.toFixed(1)}` : undefined} />
      </div>
      {fm.throttle < 0.999 && <p style={{ color: 'var(--ac-amber)' }}>⚠ Throttled to {(fm.throttle * 100).toFixed(0)}% of the unconstrained
        compression - P3&apos;s supervision cap is binding, so cycle time cannot compress as far as automation depth alone would suggest (&quot;a
        faster generator does not shorten cycle time if the queue is at the reviewer&quot;).</p>}
      <div className="ac-form-row">
        <NumField label="Measured lead time override (days, 0=use derived)" value={flow.cycleTime} min={0} step={0.5} width={110} onCommit={setFlowCycleTime} />
        <NumField label="Measured WIP (items, optional)" value={flow.wip} min={0} step={1} width={100} onCommit={setFlowWip} />
      </div>
      <p className="ac-muted">Derived lead time comes from the app&apos;s existing DORA lead-time anchor (AS-IS {fm.ctAsis.toFixed(0)}d → target), interpolated by automation depth and throttled by P3&apos;s achieved-vs-raw agent capacity ratio - never by a number invented for this tab.</p>
    </Panel>
  );
}
