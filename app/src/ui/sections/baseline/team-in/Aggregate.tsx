import type { TeamBucket, TeamLine, TeamProductRow } from '@/domain/portfolio';
import { useTeamAggregate } from '@/store/selectionHooks';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';

const help = (
  <>
    <p>Aggregate view of the entry teams of the products in view. Each product keeps its <b>own</b> AS-IS team (never shared): this page only adds them up by skill, grade and location, and lists them product by product.</p>
    <p>The sums are computed in the domain (<code>aggregateTeams</code>); nothing is typed here. To change a team, open the product with <b>Edit this product</b>.</p>
  </>
);

const PRODUCTS: AggColumn<TeamProductRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave || 'unscheduled' },
  { key: 'lines', header: 'Lines', align: 'right', render: (r) => r.lines },
  { key: 'etp', header: 'Entry FTE', align: 'right', title: 'AS-IS total of the product’s team (FTE)', render: (r) => r.etp.toFixed(2) },
];
const BUCKET: AggColumn<TeamBucket & { id: string; name: string }>[] = [{ key: 'etp', header: 'ETP', align: 'right', render: (r) => r.etp.toFixed(2) }];
const asRows = (b: TeamBucket[]) => b.map((x) => ({ ...x, id: x.key, name: x.key }));
const LINES: AggColumn<TeamLine & { id: string; name: string }>[] = [
  { key: 'grade', header: 'Grade', render: (r) => r.grade }, { key: 'loc', header: 'Location', render: (r) => r.loc }, { key: 'etp', header: 'ETP', align: 'right', render: (r) => r.etp.toFixed(2) },
];

/** Input team (AS-IS) — Aggregate view: the teams of the selection by product and, added up, by skill, grade and location (read-only; edit a product to change its team). */
export default function TeamInAggregate() {
  const t = useTeamAggregate(), vs = useViewScope(), total = t.total.toFixed(2);
  const sum = { label: `Total — ${vs.label}` };
  return (
    <SectionFrame title="Input team (AS-IS) — breakdown by resource" help={help}
      input={
        <>
          <Callout kind="blue">Read-only: the entry team belongs to each product. “Edit this product” opens the editable section for that product.</Callout>
          <AggregateTable caption={`Entry teams by product — ${vs.label}`} rows={t.products} columns={PRODUCTS} totals={{ ...sum, cells: { etp: total } }} />
        </>
      }
      result={
        <>
          <Panel title="By skill"><AggregateTable caption="Entry FTE by skill" first="Skill" rows={asRows(t.bySkill)} columns={BUCKET} edit={false} totals={{ ...sum, cells: { etp: total } }} /></Panel>
          <Panel title="By grade"><AggregateTable caption="Entry FTE by grade" first="Grade" rows={asRows(t.byGrade)} columns={BUCKET} edit={false} totals={{ ...sum, cells: { etp: total } }} /></Panel>
          <Panel title="By location"><AggregateTable caption="Entry FTE by location" first="Location" rows={asRows(t.byLoc)} columns={BUCKET} edit={false} totals={{ ...sum, cells: { etp: total } }} /></Panel>
          <Panel title="By skill, grade and location">
            <AggregateTable caption="Entry FTE by skill, grade and location" first="Skill" edit={false} columns={LINES} totals={{ ...sum, cells: { etp: total } }}
              rows={t.lines.map((l) => ({ ...l, id: `${l.skill}|${l.grade}|${l.loc}`, name: l.skill }))} />
          </Panel>
        </>
      } />
  );
}
