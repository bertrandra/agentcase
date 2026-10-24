import type { ReactNode } from 'react';
import { applyOverrideToCommon, clearProductOverride } from '@/controllers/productOverrides';
import { useInCommonView } from '@/store/commonEditHooks';
import { useFieldState, useIsMulti } from '@/store/portfolioHooks';
import { toast } from '../uiState';
import { KeepersNotice } from './KeepersNotice';

/** A short, safe text for a common value (tooltip): lists count their items, objects and long texts are cut. */
export function describeValue(v: unknown): string {
  if (v === undefined || v === null) return 'not set';
  if (Array.isArray(v)) return `${v.length} item${v.length > 1 ? 's' : ''}`;
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

/**
 * Inherited / overridden state of one overridable key for the ACTIVE product (spec F7): a chip (the common value in its tooltip), and, once the
 * product overrides it, "Revert to common" and "Apply to all products". Renders nothing with a single product (F23). In the in-place editor of the
 * common values: the products that keep their own value instead (`KeepersNotice`).
 */
export function OverrideBadge({ refKey, label }: { refKey: string; label: string }) {
  const f = useFieldState(refKey), common = useInCommonView();
  if (!f.multi) return null;
  if (common) return <KeepersNotice refKey={refKey} label={label} />;
  const back = () => { if (clearProductOverride(f.productId, refKey)) toast(`${label}: reverted to common for ${f.productName}`); };
  const all = () => { if (applyOverrideToCommon(f.productId, refKey)) toast(`${label}: applied to all products`); };
  return <OverrideChip label={label} own={f.overridden} common={f.common} onRevert={back} onApplyAll={all} />;
}

/** The chip of an inherited / overridden value (the common value in its tooltip) and, once the product has its own, its "Revert to common" (and "Apply to all products"). */
export function OverrideChip({ label, own, common, onRevert, onApplyAll }: { label: string; own: boolean; common: unknown; onRevert: () => void; onApplyAll?: () => void }) {
  const state = own ? 'overridden' : 'inherited', tip = `Common value: ${describeValue(common)}`;
  return (
    <span className="ac-ovr" data-state={state} role="group" aria-label={`${label}: ${state}`}>
      <span className="ac-ovr-chip" title={tip}>{state}<span className="ac-sr"> — {tip}</span></span>
      {own && <button type="button" className="ac-ovr-btn" aria-label={`Revert to common: ${label}`} title={`Back to the common value (${describeValue(common)})`} onClick={onRevert}>Revert to common</button>}
      {own && onApplyAll && <button type="button" className="ac-ovr-btn" aria-label={`Apply to all products: ${label}`} title="This product’s value becomes the common value" onClick={onApplyAll}>Apply to all products</button>}
    </span>
  );
}

/** A form control with its inherited / overridden badge next to it (nothing is added with a single product). */
export function InheritedField({ refKey, label, children }: { refKey: string; label: string; children: ReactNode }) {
  const multi = useIsMulti();
  if (!multi) return <>{children}</>;
  return <div className="ac-ovr-field">{children}<OverrideBadge refKey={refKey} label={label} /></div>;
}
