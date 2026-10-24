import { useMemo } from 'react';
import { isOverridden } from '@/domain/portfolio';
import { useActiveProduct, useIsMulti } from '@/store/portfolioHooks';

/** "Product: X (inherited / n overrides)" above a section that edits overridable data. `refs` are the override addresses the section writes. Nothing with one product. */
export function ProductBanner({ refs }: { refs: readonly string[] }) {
  const multi = useIsMulti(), prod = useActiveProduct();
  const n = useMemo(() => refs.filter((r) => isOverridden(prod, r)).length, [refs, prod]);
  if (!multi) return null;
  return (
    <p className="ac-prod-banner" role="note" data-overrides={n}>
      Product: <strong>{prod.name}</strong> ({n ? `${n} override${n > 1 ? 's' : ''} in this section` : 'inherited'})
      <span className="ac-muted"> — a change applies {n ? 'to this product (overridden keys) or to all, depending on the “Change” choice' : 'depending on the “Change” choice of the top bar'}.</span>
    </p>
  );
}

/** "Team of: X": the entry team is always the active product's own (spec F2), never shared. Nothing with one product. */
export function TeamOwnerLabel() {
  const multi = useIsMulti(), prod = useActiveProduct();
  if (!multi) return null;
  return <p className="ac-prod-banner" role="note">Team of: <strong>{prod.name}</strong><span className="ac-muted"> — the team belongs to this product and is never shared with the others.</span></p>;
}
