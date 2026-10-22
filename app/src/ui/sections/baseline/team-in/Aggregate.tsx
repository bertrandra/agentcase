import type { TeamBucket, TeamLine, TeamProductRow } from '@/domain/portfolio';
import { useTeamAggregate } from '@/store/selectionHooks';
import { useViewScope } from '@/store/viewScope';
import { AggregateTable, type AggColumn } from '@/ui/widgets/AggregateTable';
import { Callout, Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';

const help = (
  <>
    <p>Vue agrégée of the entry teams of the products in view. Each product keeps its <b>own</b> AS-IS team (never shared): this page only adds them up by skill, grade and location, and lists them product by product.</p>
    <p>The sums are computed in the domain (<code>aggregateTeams</code>); nothing is typed here. To change a team, open the product with <b>Éditer ce produit</b>.</p>
  </>
);

const PRODUCTS: AggColumn<TeamProductRow>[] = [
  { key: 'wave', header: 'Vague', render: (r) => r.wave || 'non planifié' },
  { key: 'lines', header: 'Lignes', align: 'right', render: (r) => r.lines },
  { key: 'etp', header: 'ETP d’entrée', align: 'right', title: 'Total AS-IS de l’équipe du produit (ETP)', render: (r) => r.etp.toFixed(2) },
];
const BUCKET: AggColumn<TeamBucket & { id: string; name: string }>[] = [{ key: 'etp', header: 'ETP', align: 'right', render: (r) => r.etp.toFixed(2) }];
const asRows = (b: TeamBucket[]) => b.map((x) => ({ ...x, id: x.key, name: x.key }));
const LINES: AggColumn<TeamLine & { id: string; name: string }>[] = [
  { key: 'grade', header: 'Grade', render: (r) => r.grade }, { key: 'loc', header: 'Localisation', render: (r) => r.loc }, { key: 'etp', header: 'ETP', align: 'right', render: (r) => r.etp.toFixed(2) },
];

/** Input team (AS-IS) — Vue agrégée: the teams of the selection by product and, added up, by skill, grade and location (read-only; edit a product to change its team). */
export default function TeamInAggregate() {
  const t = useTeamAggregate(), vs = useViewScope(), total = t.total.toFixed(2);
  const sum = { label: `Total — ${vs.label}` };
  return (
    <SectionFrame title="Input team (AS-IS) — breakdown by resource" help={help}
      input={
        <>
          <Callout kind="blue">Lecture seule : l’équipe d’entrée est propre à chaque produit. « Éditer ce produit » ouvre la section modifiable pour ce produit.</Callout>
          <AggregateTable caption={`Équipes d’entrée par produit — ${vs.label}`} rows={t.products} columns={PRODUCTS} totals={{ ...sum, cells: { etp: total } }} />
        </>
      }
      result={
        <>
          <Panel title="Par compétence"><AggregateTable caption="ETP d’entrée par compétence" first="Compétence" rows={asRows(t.bySkill)} columns={BUCKET} edit={false} totals={{ ...sum, cells: { etp: total } }} /></Panel>
          <Panel title="Par grade"><AggregateTable caption="ETP d’entrée par grade" first="Grade" rows={asRows(t.byGrade)} columns={BUCKET} edit={false} totals={{ ...sum, cells: { etp: total } }} /></Panel>
          <Panel title="Par localisation"><AggregateTable caption="ETP d’entrée par localisation" first="Localisation" rows={asRows(t.byLoc)} columns={BUCKET} edit={false} totals={{ ...sum, cells: { etp: total } }} /></Panel>
          <Panel title="Par compétence, grade et localisation">
            <AggregateTable caption="ETP d’entrée par compétence, grade et localisation" first="Compétence" edit={false} columns={LINES} totals={{ ...sum, cells: { etp: total } }}
              rows={t.lines.map((l) => ({ ...l, id: `${l.skill}|${l.grade}|${l.loc}`, name: l.skill }))} />
          </Panel>
        </>
      } />
  );
}
