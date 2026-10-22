import { fmtRoiPct } from '@/domain/economics/roi';
import type { PortfolioHeadline } from '@/domain/portfolio';
import { fmtEurK, fmtMonths, fmtPct } from '@/ui/format';
import { Stat, StatRow } from '@/ui/widgets/cards';

/** The portfolio headline as cards: every figure is read from the domain headline of the consolidated series (nothing is added up here). */
export function Cards({ h }: { h: PortfolioHeadline }) {
  const e = h.endYear, cr = h.costReduction;
  return (
    <StatRow>
      <Stat label={`Économies Y${e.index}`} value={fmtEurK(e.savings)} tone="teal" hint="Économies de la dernière année calendaire de l’horizon, somme des produits planifiés décalés" />
      <Stat label={`Coût de fonctionnement Y${e.index}`} value={fmtEurK(e.run)} tone="amber" hint="Coût de fonctionnement to-be de la dernière année calendaire" />
      <Stat label="Mise en place" value={fmtEurK(h.setup)} tone="grey" hint="Somme des investissements de mise en place, positionnés sur leurs mois (préparation du transfert de connaissance comprise)" />
      <Stat label="Net" value={fmtEurK(h.net)} tone={h.net < 0 ? 'brick' : 'teal'} hint="Économies cumulées moins mise en place, sur l’horizon calendaire" />
      <Stat label="ROI" value={fmtRoiPct(h.roi)} hint="Net / mise en place du portefeuille consolidé (n/a sans mise en place)" />
      <Stat label="Retour (mois)" value={fmtMonths(h.paybackMonth)} hint="Premier mois calendaire où la trésorerie cumulée consolidée est positive ou nulle" />
      <Stat label="VAN calendaire" value={fmtEurK(h.npv)} hint="Chaque mois calendaire est actualisé au taux commun depuis le mois 1 du portefeuille ; la somme des produits est la VAN du portefeuille" />
      <Stat label={`Économies sur ${cr.years} ans`} value={cr.ok ? fmtPct(cr.net * 100) : 'n/a'} tone={cr.ok && cr.net < 0 ? 'brick' : 'teal'} hint="(Économies − mise en place) / coût de référence, composants sommés sur les produits planifiés" />
      <Stat label="Vélocité" value={`${h.velocityPct >= 0 ? '+' : ''}${Math.round(h.velocityPct)}%`} hint="Hausse de vélocité moyenne pondérée par l’effectif d’entrée de chaque produit" />
    </StatRow>
  );
}
