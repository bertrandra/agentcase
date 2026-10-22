import type { ComponentType } from 'react';
import { aggregateTeams, type InputSummaryRow, type SelectionRow } from '@/domain/portfolio';
import { useCorePortfolio } from '@/store/consolidationHooks';
import { useInputSummary, useSelectionView } from '@/store/selectionHooks';
import { useViewScope } from '@/store/viewScope';
import { fmtEurK, fmtMonths } from '../format';
import { AggregateTable, type AggColumn } from '../widgets/AggregateTable';
import { Callout } from '../widgets/cards';
import { ProductDrill } from '../widgets/ProductDrill';
import { SectionFrame } from './SectionFrame';
import type { SectionKind } from './sectionScope';

/** What a generic Vue agrégée receives: the section (id, title) and its product-view component, which the drill-down renders for each product. */
export interface FallbackProps { id: string; title: string; Section: ComponentType | null }

const R = 'right' as const;
const ROLLUP: AggColumn<SelectionRow>[] = [
  { key: 'wave', header: 'Vague', render: (r) => r.wave },
  { key: 'setup', header: 'Mise en place', align: R, title: 'Investissement de mise en place du produit, sur l’axe calendaire', render: (r) => fmtEurK(r.setup) },
  { key: 'savings', header: 'Économies', align: R, title: 'Économies cumulées sur l’horizon calendaire', render: (r) => fmtEurK(r.savings) },
  { key: 'net', header: 'Net', align: R, render: (r) => fmtEurK(r.net) },
  { key: 'npv', header: 'VAN calendaire', align: R, title: 'Actualisée depuis le mois 1 du portefeuille : la somme des lignes est la VAN de la sélection', render: (r) => fmtEurK(r.npv) },
  { key: 'payback', header: 'Retour', align: R, render: (r) => fmtMonths(r.paybackMonth) },
];

/** R-rollup without its own aggregate: the key figures of each product of the selection (domain lines and total), then the section itself per product. */
export function RollupFallback({ title, Section }: FallbackProps) {
  const v = useSelectionView(), vs = useViewScope();
  if (!v) return null;
  const t = v.totals;
  return (
    <SectionFrame title={title} result={
      <>
        <AggregateTable caption={`Chiffres clés par produit — ${v.label}`} rows={v.rows} columns={ROLLUP} edit={false}
          totals={{ label: `Total — ${v.label}`, cells: { setup: fmtEurK(t.setup), savings: fmtEurK(t.savings), net: fmtEurK(t.net), npv: fmtEurK(t.npv), payback: fmtMonths(t.paybackMonth) } }} />
        <Callout kind="blue">Cette section vérifie ou détaille chaque produit séparément : les chiffres ne s’additionnent pas. Ouvrez un produit ci-dessous pour voir la section telle qu’il la calcule.</Callout>
        {Section && <ProductDrill Section={Section} productIds={vs.productIds} />}
      </>
    } />
  );
}

const INPUTS: AggColumn<InputSummaryRow>[] = [
  { key: 'wave', header: 'Vague', render: (r) => r.wave },
  { key: 'etp', header: 'ETP d’entrée', align: R, title: 'Équipe d’entrée propre au produit', render: (r) => r.etp.toFixed(1) },
  { key: 'art', header: 'Artefacts SDLC', align: R, render: (r) => r.artefacts },
  { key: 'reg', header: 'Artefacts réglementaires', align: R, render: (r) => r.regArtefacts },
  { key: 'ovr', header: 'Surcharges', align: R, title: 'Valeurs propres au produit (0 = tout est hérité)', render: (r) => r.overrides },
  { key: 'hub', header: 'Knowledge Hub', render: (r) => r.hub },
];

/** I-input without its own aggregate: what each product of the selection holds (team, scope, overrides, hub) and the button to edit it. */
export function InputFallback({ title }: FallbackProps) {
  const rows = useInputSummary(), core = useCorePortfolio(), vs = useViewScope();
  const etp = aggregateTeams(core, vs.productIds).total;
  return (
    <SectionFrame title={title} input={
      <>
        <Callout kind="blue">Lecture seule : les saisies de cette section sont propres à chaque produit. Choisissez « Éditer ce produit » pour rendre la section modifiable pour ce produit.</Callout>
        <AggregateTable caption={`Saisies par produit — ${vs.label}`} rows={rows} columns={INPUTS}
          totals={{ label: `Total — ${vs.label}`, cells: { etp: etp.toFixed(1) } }} />
      </>
    } />
  );
}

/** R-conso that has no consolidated form yet (TODO tracked in docs/VUE_AGREGEE.md): the section per product, plus an explicit note. */
export function ConsoFallback({ title, Section }: FallbackProps) {
  const vs = useViewScope();
  return (
    <SectionFrame title={title} result={
      <>
        <Callout kind="blue">Vue consolidée à venir pour cette section : le détail par produit de la sélection ({vs.label}) est ci-dessous. Aucun chiffre n’est additionné ici.</Callout>
        {Section && <ProductDrill Section={Section} productIds={vs.productIds} />}
      </>
    } />
  );
}

/** The generic fallback of each kind that follows the Vue (the other kinds render the section as it is). */
export const FALLBACKS: Partial<Record<SectionKind, ComponentType<FallbackProps>>> = { 'R-rollup': RollupFallback, 'I-input': InputFallback, 'R-conso': ConsoFallback };
