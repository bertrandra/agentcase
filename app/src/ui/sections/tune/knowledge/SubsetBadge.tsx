import type { ReactNode } from 'react';
import { setProductKnowledge } from '@/controllers/productOverrides';
import type { SubsetField } from '@/domain/portfolio';
import { useSubsetField } from '@/store/knowledgeHooks';
import { toast } from '@/ui/uiState';
import { describeValue } from '@/ui/widgets/OverrideBadge';

/**
 * Inherited / own state of one field of the ACTIVE product's knowledge subset (spec F26): the chip says "inherited" (the common reading in its tooltip) or
 * "overridden", and a product's own value can go back to the common one. Renders nothing with a single product (F23).
 */
export function SubsetBadge({ field, label }: { field: SubsetField; label: string }) {
  const f = useSubsetField(field);
  if (!f.multi) return null;
  const state = f.own ? 'overridden' : 'inherited', tip = `Common value: ${describeValue(f.common)}`;
  const back = () => { if (setProductKnowledge(f.productId, {}, [field])) toast(`${label}: reverted to common for ${f.productName}`); };
  return (
    <span className="ac-ovr" data-state={f.own ? 'overridden' : 'inherited'} role="group" aria-label={`${label}: ${state}`}>
      <span className="ac-ovr-chip" title={tip}>{state}<span className="ac-sr"> — {tip}</span></span>
      {f.own && <button type="button" className="ac-ovr-btn" aria-label={`Revert to common: ${label}`} title={`Back to the common value (${describeValue(f.common)})`} onClick={back}>Revert to common</button>}
    </span>
  );
}

/** A form control with the badge of its subset field next to it (nothing is added with a single product). */
export function SubsetFieldBox({ field, label, children }: { field: SubsetField; label: string; children: ReactNode }) {
  const f = useSubsetField(field);
  if (!f.multi) return <>{children}</>;
  return <div className="ac-ovr-field">{children}<SubsetBadge field={field} label={label} /></div>;
}
