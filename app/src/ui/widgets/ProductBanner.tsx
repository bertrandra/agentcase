import { useMemo } from 'react';
import { isOverridden } from '@/domain/portfolio';
import { useActiveProduct, useIsMulti } from '@/store/portfolioHooks';

/** "Produit : X (hérité / n surcharges)" above a section that edits overridable data. `refs` are the override addresses the section writes. Nothing with one product. */
export function ProductBanner({ refs }: { refs: readonly string[] }) {
  const multi = useIsMulti(), prod = useActiveProduct();
  const n = useMemo(() => refs.filter((r) => isOverridden(prod, r)).length, [refs, prod]);
  if (!multi) return null;
  return (
    <p className="ac-prod-banner" role="note" data-overrides={n}>
      Produit : <strong>{prod.name}</strong> ({n ? `${n} surcharge${n > 1 ? 's' : ''} dans cette section` : 'hérité'})
      <span className="ac-muted"> — une modification s’applique {n ? 'à ce produit (clés surchargées) ou à tous selon le mode « Modifier »' : 'selon le mode « Modifier » de la barre haute'}.</span>
    </p>
  );
}

/** "Équipe de : X": the entry team is always the active product's own (spec F2), never shared. Nothing with one product. */
export function TeamOwnerLabel() {
  const multi = useIsMulti(), prod = useActiveProduct();
  if (!multi) return null;
  return <p className="ac-prod-banner" role="note">Équipe de : <strong>{prod.name}</strong><span className="ac-muted"> — l’équipe est propre à ce produit, jamais partagée avec les autres.</span></p>;
}
