import type { TeamBucket, TeamLine, TeamProductRow } from '@/domain/portfolio';
import { useTeamAggregate } from '@/store/selectionHooks';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ExcludedNote } from '../../aggregates/AggregateParts';

const help = (
  <>
    <p>Aggregate view of the entry teams of the products in view. Each product keeps its <b>own</b> AS-IS team (never shared): this page only adds them up by
      skill, grade and location, and lists them product by product.</p>
    <p>The sums are computed in the domain (<code>aggregateTeams</code>); nothing is typed here. To change a team, open the product with <b>Edit this
      product</b>.</p>
  </>
);

const PRODUCTS: AggColumn<TeamProductRow>[] = [
  { key: 'wave', header: 'Wave', render: (r) => r.wave || 'unscheduled' },
  { key: 'lines', header: 'Lines', align: 'right', render: (r) => r.lines },
  { key: 'etp', header: 'Entry FTE', align: 'right', title: 'AS-IS total of the product’s team (FTE)', render: (r) => r.etp.toFixed(2) },
];
const FTE = { key: 'etp', header: 'FTE', align: 'right', render: (r: { etp: number }) => r.etp.toFixed(2) } as const;
const BUCKET: AggColumn<TeamBucket & { id: string; name: string }>[] = [FTE];
const asRows = (b: TeamBucket[]) => b.map((x) => ({ ...x, id: x.key, name: x.key }));
const LINES: AggColumn<TeamLine & { id: string; name: string }>[] = [
  { key: 'grade', header: 'Grade', render: (r) => r.grade }, { key: 'loc', header: 'Location', render: (r) => r.loc }, FTE,
];

/** One "added up by …" panel: entry FTE by skill, grade or location. */
function BucketPanel({ by, first, buckets, totals }: { by: string; first: string; buckets: TeamBucket[]; totals: { label: string; cells: { etp: string } } }) {
  return (
    <Panel title={`By ${by}`}>
      <AggregateTable caption={`Entry FTE by ${by}`} first={first} rows={asRows(buckets)} columns={BUCKET} edit={false} totals={totals} />
    </Panel>
  );
}

/**
 * Input team (AS-IS) — Aggregate view: the teams of the selection by product and, added
 * up, by skill, grade and location (read-only; edit a product to change its team).
 */
export default function TeamInAggregate() {
  const t = useTeamAggregate(), vs = useViewScope(), total = t.total.toFixed(2);
  const totals = { label: `Total — ${vs.label}`, cells: { etp: total } };
  return (
    <SectionFrame title="Input team (AS-IS) — breakdown by resource" help={help}
      input={
        <>
          <Callout kind="blue">Summary, read-only: the entry team belongs to each product. Pick a product in “Change” of the top bar to change its team in place
            below, or “Edit this product” to view that product.</Callout>
          <AggregateTable caption={`Entry teams by product — ${vs.label}`} rows={t.products} columns={PRODUCTS} totals={totals} />
          <ExcludedNote />
        </>
      }
      result={
        <>
          <BucketPanel by="skill" first="Skill" buckets={t.bySkill} totals={totals} />
          <BucketPanel by="grade" first="Grade" buckets={t.byGrade} totals={totals} />
          <BucketPanel by="location" first="Location" buckets={t.byLoc} totals={totals} />
          <Panel title="By skill, grade and location">
            <AggregateTable caption="Entry FTE by skill, grade and location" first="Skill" edit={false} columns={LINES} totals={totals}
              rows={t.lines.map((l) => ({ ...l, id: `${l.skill}|${l.grade}|${l.loc}`, name: l.skill }))} />
          </Panel>
        </>
      } />
  );
}
