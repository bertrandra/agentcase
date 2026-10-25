import type { ReactNode } from 'react';
import { applySubsetFieldToCommon, setProductKnowledge } from '@/controllers/productOverrides';
import { hasCommonLevel, type SubsetField } from '@/domain/portfolio';
import { useInCommonView } from '@/store/commonEditHooks';
import { useSubsetField } from '@/store/knowledgeHooks';
import { toast } from '@/ui/uiState';
import { KeepersNotice } from '@/ui/widgets/KeepersNotice';
import { OverrideChip } from '@/ui/widgets/OverrideBadge';

/**
 * Inherited / own state of one field of the ACTIVE product's knowledge subset (spec F26): the chip says "inherited" (the common reading in its tooltip) or
 * "overridden", and a product's own value can go back to the common one or, for a field the common case holds (not the domains nor the
 * preparation months), be applied to all products (spec F7). Renders nothing with a single product (F23). In the in-place editor of the
 * common values: the products whose subset keeps their own value (`KeepersNotice`).
 */
export function SubsetBadge({ field, label }: { field: SubsetField; label: string }) {
  const f = useSubsetField(field), common = useInCommonView();
  if (!f.multi) return null;
  if (common) return <KeepersNotice refKey={`knowledge.${field}`} label={label} />;
  const back = () => { if (setProductKnowledge(f.productId, {}, [field])) toast(`${label}: reverted to common for ${f.productName}`); };
  const all = () => { if (applySubsetFieldToCommon(f.productId, field)) toast(`${label}: applied to all products`); };
  return <OverrideChip label={label} own={f.own} common={f.common} onRevert={back} onApplyAll={hasCommonLevel(field) ? all : undefined} />;
}

/** A form control with the badge of its subset field next to it (nothing is added with a single product). */
export function SubsetFieldBox({ field, label, children }: { field: SubsetField; label: string; children: ReactNode }) {
  const f = useSubsetField(field);
  if (!f.multi) return <>{children}</>;
  return <div className="ac-ovr-field">{children}<SubsetBadge field={field} label={label} /></div>;
}
