import type { PhaseScopeRow } from '@/domain/portfolio';
import { useScopePhases } from '@/store/selectionHooksScope';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Stat, StatRow } from '@/ui/widgets/cards';
import { InputAggregate } from '../../aggregates/AggregateParts';

const MARK = { all: 'in', some: 'partly', none: 'out' } as const;
const help = <p>Aggregate view of the phase scope: for each product and each SDLC phase, whether the phase is in scope (in / partly / out), its share of the effort after lifecycle weighting and its active artefacts. The last line counts the products that keep each phase.</p>;

/** Phase scope — Aggregate view: the phases each product keeps in or out of its scope, and how many products keep each phase. */
export default function PhaseScopeAggregate() {
  const a = useScopePhases(), vs = useViewScope(), n = a.rows.length;
  const cols: AggColumn<PhaseScopeRow>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave },
    { key: 'art', header: 'Artefacts in scope', align: 'right', render: (r) => `${r.selected}/${r.total}` },
    ...a.phases.map((p) => ({
      key: p.id, header: p.name, title: `${p.name}: state, effort share, active artefacts`,
      render: (r: PhaseScopeRow) => { const c = r.cells[p.id]; return c ? `${MARK[c.state]} · ${c.share.toFixed(0)}% · ${c.active} art.` : '—'; },
    })),
  ];
  return (
    <InputAggregate title="🎯 Phase scope" help={help} intro="the phases in scope belong to each product.">
      <StatRow>
        <Stat label="Products with a disabled phase" value={`${a.disabled}/${n}`} tone={a.disabled ? 'amber' : 'teal'} />
      </StatRow>
      <AggregateTable caption={`Phase scope by product — ${vs.label}`} rows={a.rows} columns={cols}
        totals={{ label: `Products keeping the phase — ${vs.label}`, cells: Object.fromEntries(a.phases.map((p) => [p.id, `${a.productsIn[p.id] ?? 0}/${n} products`])) }} />
    </InputAggregate>
  );
}
