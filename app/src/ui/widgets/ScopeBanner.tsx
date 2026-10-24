import { useEditScope } from '@/store/portfolioHooks';
import { useViewScope, type ViewScope } from '@/store/viewScope';
import { useUi } from '../uiState';
import { sectionKind, type SectionKind } from '../zones/sectionScope';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n > 1 ? many : one}`;

/** The one sentence a section states about the View (pure, so tests and the docs read the same text). */
export function scopeText(kind: SectionKind, v: ViewScope, editAll = false): { main: string; detail: string } {
  const n = v.productIds.length, planned = plural(n, 'planned product', 'planned products');
  const sel = v.kind === 'portfolio' ? `Portfolio (${planned})` : `Wave: ${v.label} (${planned})`;
  const k = v.excludedIds.length, out = k ? ` — ${plural(k, 'unscheduled or archived product', 'unscheduled or archived products')} excluded from the figures` : '';
  if (kind === 'S-static') return { main: 'Independent of the view', detail: '' };
  if (kind === 'P-portfolio') return { main: 'Portfolio level', detail: '' };
  const editing = v.kind !== 'product' && editAll ? 'Editing: All products (common values)' : `Editing: product ${v.activeProductName}`;
  if (kind === 'I-input') return { main: editing, detail: v.kind === 'product' ? '' : ` — aggregate view of the selection below: ${sel}${out}` };
  return { main: `Calculated on: ${v.kind === 'product' ? `Product: ${v.label}` : `${sel}${out}`}`, detail: '' };
}

/**
 * States the View and what it means for THIS section by kind (docs/VUE_AGREGEE.md): "Calculated on: Portfolio (3 planned products)" for a result,
 * "Editing: product X — aggregate view..." for an input ("Editing: All products (common values)" with that Edit choice in a Portfolio / Wave), "Independent of the view" for a reference, "Portfolio level" for the Portfolio group.
 * A polite live region, so a change of View is read once the section re-renders. Nothing at all with one product.
 */
export function ScopeBanner() {
  const v = useViewScope(), id = useUi((s) => s.activeSection), editAll = useEditScope() === 'all';
  if (!v.multi) return null;
  const kind = sectionKind(id), t = scopeText(kind, v, editAll);
  return (
    <p className="ac-scope-banner" aria-live="polite" data-scope-kind={kind} data-view={v.kind}>
      {t.main}{t.detail && <span className="ac-muted">{t.detail}</span>}
    </p>
  );
}
