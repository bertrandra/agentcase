import { useEditScope } from '@/store/portfolioHooks';
import { useViewKind, useViewScope, type ViewScope } from '@/store/viewScope';
import { useUi } from '../uiState';
import { sectionKind, type SectionKind } from '../zones/sectionScope';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n > 1 ? many : one}`;

/** The one sentence a section states about the View (pure, so tests and the docs read the same text). */
export function scopeText(kind: SectionKind, v: ViewScope, editAll = false): { main: string; detail: string } {
  const n = v.productIds.length, planned = plural(n, 'planned product', 'planned products');
  const sel = v.kind === 'portfolio' ? `Portfolio (${planned})` : `${v.kind === 'unit' ? 'Unit' : 'Wave'}: ${v.label} (${planned})`;
  const k = v.excludedIds.length,
    out = k ? ` — ${plural(k, 'unscheduled or archived product', 'unscheduled or archived products')} excluded from the figures` : '';
  if (kind === 'S-static') return { main: 'Independent of the view', detail: '' };
  if (kind === 'P-portfolio') return { main: 'Portfolio level', detail: '' };
  const editing = v.kind !== 'product' && editAll ? 'Changing: all products (shared values)' : `Changing: product ${v.activeProductName}`;
  if (kind === 'I-input') return { main: editing, detail: v.kind === 'product' ? '' : ` — aggregate view of the selection below: ${sel}${out}` };
  return { main: `Calculated on: ${v.kind === 'product' ? `Product: ${v.label}` : `${sel}${out}`}`, detail: '' };
}

/**
 * States the View and what it means for THIS section by kind (docs/VUE_AGREGEE.md): "Calculated on: Portfolio (3 planned products)" for a result,
 * "Changing: product X — aggregate view..." for an input ("Changing: all products (shared values)" with that Change choice in a Portfolio / Wave),
 * "Independent of the view" for a reference, "Portfolio level" for the Portfolio group.
 * A polite live region, so a change of View is read once the section re-renders. Nothing at all with one product.
 */
export function ScopeBanner() {
  return useViewKind().multi ? <ScopeBannerText /> : null;   // one product: nothing, and no re-render on every edit of the case
}
function ScopeBannerText() {
  const v = useViewScope(), id = useUi((s) => s.activeSection), editAll = useEditScope() === 'all';
  const kind = sectionKind(id), t = scopeText(kind, v, editAll);
  return (
    <p className="ac-scope-banner" aria-live="polite" data-scope-kind={kind} data-view={v.kind}>
      {t.main}{t.detail && <span className="ac-muted">{t.detail}</span>}
    </p>
  );
}
