import type { ContestedArtefact, ScopeSelRow } from '@/domain/portfolio';
import { useScopeSelection } from '@/store/selectionHooksScope';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout, Panel, Stat, StatRow } from '@/ui/widgets/cards';
import { InputAggregate } from '../../aggregates/AggregateParts';

const R = 'right' as const, SHOWN = 15;
const help = <p>Aggregate view of the artefact selection: how many SDLC and regulatory artefacts each product keeps, how it differs from the common selection, and a coverage matrix by phase. Artefacts the products disagree on are listed at the bottom.</p>;

/**
 * Scope — target artifact selection — Aggregate view: coverage of the artefact selection
 * by product and phase, differences from the common selection and contested artefacts.
 */
export default function ScopeSelAggregate() {
  const a = useScopeSelection(), vs = useViewScope(), n = a.rows.length;
  const diff = (r: ScopeSelRow) => (r.added || r.removed ? `+${r.added} / −${r.removed}` : 'same as common');
  const cols: AggColumn<ScopeSelRow>[] = [
    { key: 'wave', header: 'Wave', render: (r) => r.wave },
    { key: 'sdlc', header: 'SDLC artefacts', align: R, render: (r) => `${r.sdlc}/${r.sdlcTotal}` },
    { key: 'reg', header: 'Regulatory artefacts', align: R, render: (r) => r.reg },
    { key: 'edited', header: 'Adjusted artefacts', align: R, title: 'Artefacts whose automation or effort was adjusted', render: (r) => r.edited },
    { key: 'diff', header: 'Difference from common', title: 'Artefacts added / removed against the common selection', render: diff },
    { key: 'own', header: 'Selection', render: (r) => (r.own ? 'own selection' : 'inherited') },
  ];
  const matrix: AggColumn<ScopeSelRow>[] = a.phases.map((p) => ({ key: p.id, header: p.name, align: R, render: (r) => r.phases[p.id] ?? 0 }));
  const hot: AggColumn<ContestedArtefact & { id: string; name: string }>[] = [
    { key: 'phase', header: 'Phase', render: (r) => r.phase }, { key: 'count', header: 'Selected by', align: R, render: (r) => `${r.count}/${n} products` },
  ];
  return (
    <InputAggregate title="Scope — target artifact selection" help={help} intro="the artefact selection belongs to each product.">
      <StatRow>
        <Stat label="Common selection" value={`${a.common.sdlc} SDLC + ${a.common.reg} reg.`} />
        <Stat label="Selected by every product" value={`${a.unanimous} artefacts`} tone="teal" />
        <Stat label="Contested artefacts" value={String(a.contested.length)} tone={a.contested.length ? 'amber' : 'teal'} />
      </StatRow>
      <AggregateTable caption={`Artefact selection by product — ${vs.label}`} rows={a.rows} columns={cols}
        totals={{ label: `Total — ${vs.label}`, cells: { sdlc: a.total.sdlc, reg: a.total.reg } }} />
      <Panel title="Coverage by phase">
        <AggregateTable caption={`Selected artefacts by product and phase — ${vs.label}`} rows={a.rows} columns={matrix} edit={false}
          totals={{ label: `Total — ${vs.label}`, cells: Object.fromEntries(a.phases.map((p) => [p.id, a.total.phases[p.id] ?? 0])) }} />
      </Panel>
      <Panel title="Artefacts the products disagree on">
        {a.contested.length === 0 ? <Callout kind="green">Every SDLC artefact is either selected by all the products or by none.</Callout>
          : <AggregateTable caption={`Contested artefacts — ${vs.label}`} first="Artefact" rows={a.contested.slice(0, SHOWN)} columns={hot} edit={false} />}
        {a.contested.length > SHOWN && <p className="ac-muted">{a.contested.length - SHOWN} more contested artefacts are not listed.</p>}
      </Panel>
    </InputAggregate>
  );
}
