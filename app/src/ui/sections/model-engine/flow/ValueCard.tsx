import { resetFlow, setFlowDiscount, setFlowMargin, setFlowShare } from '@/controllers/modelFlow';
import type { flowModel } from '@/domain/model/flow';
import { flowOf } from '@/domain/model/modelState';
import { useCtx } from '@/store/hooks';
import { NumField } from '@/ui/widgets/CommitField';
import { Callout, Panel } from '@/ui/widgets/cards';
import { Tile, fmtK } from '../shared';

/** Sponsor-owned time-to-market value: hidden (not zero) until a real margin per month is provided. */
export function ValueCard({ fm }: { fm: ReturnType<typeof flowModel> }) {
  const flow = flowOf(useCtx().s.MODEL);
  const title = 'Time-to-market value';
  const owner = <small className="ac-muted">sponsor-owned</small>;
  if (!fm.hasMargin) {
    return (
      <Panel title={title} aside={owner}>
        <Callout>This valuation is <strong>hidden, not zero</strong>, until a real margin-per-month is provided - the spec&apos;s own warning against reading a blank revenue field as &quot;no value&quot;. Provide it once your sponsor has one.</Callout>
        <NumField label="Margin per month (€, sponsor-owned)" value={flow.marginPerMonth || 0} min={0} step={1000} width={160} onCommit={setFlowMargin} />
      </Panel>
    );
  }
  return (
    <Panel title={title} aside={owner}>
      <Callout>Phase <strong>ON</strong>. Value of arriving {fm.deltaTRaw.toFixed(2)} months earlier, {(fm.share * 100).toFixed(0)}% of which is credited here (the rest is assumed already captured as ordinary cost-out in the Financial tab - CC-FL-01&apos;s double-counting guard).</Callout>
      <div className="ac-form-row">
        <NumField label="Margin per month (€)" value={flow.marginPerMonth} min={0} step={1000} width={120} onCommit={setFlowMargin} />
        <NumField label="Discount rate (/yr)" value={flow.discountRate} min={0} max={1} step={0.01} width={90} onCommit={setFlowDiscount} />
        <NumField label="Throughput-in share (%)" value={flow.throughputInShare} min={0} max={100} step={5} width={90} onCommit={setFlowShare} />
        <button type="button" data-tone="danger" onClick={resetFlow}>Reset / hide this valuation</button>
      </div>
      <div className="ac-stat-row">
        <Tile label="Δt raw / credited" value={`${fm.deltaTRaw.toFixed(2)} / ${fm.deltaTEff.toFixed(2)} mo`} />
        <Tile label="Flow NPV" tone="teal" value={fmtK(fm.flowNpv)} />
        <Tile label={`Combined ${fm.endLabel || 'end-year'} value`} tone="purple" value={fmtK(fm.combinedY3Value)} note="= Financial savings + Flow NPV" />
      </div>
    </Panel>
  );
}
