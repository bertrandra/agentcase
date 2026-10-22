import type { ReactNode } from 'react';
import { setProductKnowledge } from '@/controllers/productOverrides';
import type { SubsetField } from '@/domain/portfolio';
import { useSubsetField } from '@/store/knowledgeHooks';
import { toast } from '@/ui/uiState';
import { describeValue } from '@/ui/widgets/OverrideBadge';

/**
 * Inherited / own state of one field of the ACTIVE product's knowledge subset (spec F26): the chip says "hérité" (the common reading in its tooltip) or
 * "surchargé", and a product's own value can go back to the common one. Renders nothing with a single product (F23).
 */
export function SubsetBadge({ field, label }: { field: SubsetField; label: string }) {
  const f = useSubsetField(field);
  if (!f.multi) return null;
  const state = f.own ? 'surchargé' : 'hérité', tip = `Valeur commune : ${describeValue(f.common)}`;
  const back = () => { if (setProductKnowledge(f.productId, {}, [field])) toast(`${label} : retour au commun pour ${f.productName}`); };
  return (
    <span className="ac-ovr" data-state={f.own ? 'overridden' : 'inherited'} role="group" aria-label={`${label} : ${state}`}>
      <span className="ac-ovr-chip" title={tip}>{state}<span className="ac-sr"> — {tip}</span></span>
      {f.own && <button type="button" className="ac-ovr-btn" aria-label={`Revenir au commun : ${label}`} title={`Revenir à la valeur commune (${describeValue(f.common)})`} onClick={back}>Revenir au commun</button>}
    </span>
  );
}

/** A form control with the badge of its subset field next to it (nothing is added with a single product). */
export function SubsetFieldBox({ field, label, children }: { field: SubsetField; label: string; children: ReactNode }) {
  const f = useSubsetField(field);
  if (!f.multi) return <>{children}</>;
  return <div className="ac-ovr-field">{children}<SubsetBadge field={field} label={label} /></div>;
}
