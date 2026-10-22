import type { ReactNode } from 'react';
import { applyOverrideToCommon, clearProductOverride } from '@/controllers/productOverrides';
import { useFieldState, useIsMulti } from '@/store/portfolioHooks';
import { toast } from '../uiState';

/** A short, safe text for a common value (tooltip): lists count their items, objects and long texts are cut. */
export function describeValue(v: unknown): string {
  if (v === undefined || v === null) return 'non définie';
  if (Array.isArray(v)) return `${v.length} élément${v.length > 1 ? 's' : ''}`;
  const t = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return t.length > 120 ? `${t.slice(0, 117)}…` : t;
}

/**
 * Inherited / overridden state of one overridable key for the ACTIVE product (spec F7): a chip (the common value in its tooltip), and, once the
 * product overrides it, "Revenir au commun" and "Appliquer à tous les produits". Renders nothing with a single product (F23).
 */
export function OverrideBadge({ refKey, label }: { refKey: string; label: string }) {
  const f = useFieldState(refKey);
  if (!f.multi) return null;
  const state = f.overridden ? 'surchargé' : 'hérité', tip = `Valeur commune : ${describeValue(f.common)}`;
  const back = () => { if (clearProductOverride(f.productId, refKey)) toast(`${label} : retour au commun pour ${f.productName}`); };
  const all = () => { if (applyOverrideToCommon(f.productId, refKey)) toast(`${label} : appliqué à tous les produits`); };
  return (
    <span className="ac-ovr" data-state={f.overridden ? 'overridden' : 'inherited'} role="group" aria-label={`${label} : ${state}`}>
      <span className="ac-ovr-chip" title={tip}>{state}<span className="ac-sr"> — {tip}</span></span>
      {f.overridden && (
        <>
          <button type="button" className="ac-ovr-btn" aria-label={`Revenir au commun : ${label}`} title={`Revenir à la valeur commune (${describeValue(f.common)})`} onClick={back}>Revenir au commun</button>
          <button type="button" className="ac-ovr-btn" aria-label={`Appliquer à tous les produits : ${label}`} title="La valeur de ce produit devient la valeur commune" onClick={all}>Appliquer à tous les produits</button>
        </>
      )}
    </span>
  );
}

/** A form control with its inherited / overridden badge next to it (nothing is added with a single product). */
export function InheritedField({ refKey, label, children }: { refKey: string; label: string; children: ReactNode }) {
  const multi = useIsMulti();
  if (!multi) return <>{children}</>;
  return <div className="ac-ovr-field">{children}<OverrideBadge refKey={refKey} label={label} /></div>;
}
