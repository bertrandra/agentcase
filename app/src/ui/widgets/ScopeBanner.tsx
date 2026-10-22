import { useViewScope, type ViewScope } from '@/store/viewScope';
import { useUi } from '../uiState';
import { sectionKind, type SectionKind } from '../zones/sectionScope';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n > 1 ? many : one}`;

/** The one sentence a section states about the Vue (pure, so tests and the docs read the same text). */
export function scopeText(kind: SectionKind, v: ViewScope): { main: string; detail: string } {
  const n = v.productIds.length, planned = plural(n, 'produit planifié', 'produits planifiés');
  const sel = v.kind === 'portfolio' ? `Portefeuille (${planned})` : `Vague ${v.label} (${planned})`;
  const k = v.excludedIds.length, out = k ? ` — ${plural(k, 'produit non planifié ou archivé', 'produits non planifiés ou archivés')}, exclu${k > 1 ? 's' : ''} des chiffres` : '';
  if (kind === 'S-static') return { main: 'Indépendant de la vue', detail: '' };
  if (kind === 'P-portfolio') return { main: 'Niveau portefeuille', detail: '' };
  if (kind === 'I-input') return { main: `Édition : produit ${v.activeProductName}`, detail: v.kind === 'product' ? '' : ` — vue agrégée de la sélection ci-dessous : ${sel}${out}` };
  return { main: `Calculé sur : ${v.kind === 'product' ? `Produit ${v.label}` : `${sel}${out}`}`, detail: '' };
}

/**
 * States the Vue and what it means for THIS section by kind (docs/VUE_AGREGEE.md): "Calculé sur : Portefeuille (3 produits planifiés)" for a result,
 * "Édition : produit X — vue agrégée..." for an input, "Indépendant de la vue" for a reference, "Niveau portefeuille" for the Portefeuille group.
 * A polite live region, so a change of Vue is read once the section re-renders. Nothing at all with one product.
 */
export function ScopeBanner() {
  const v = useViewScope(), id = useUi((s) => s.activeSection);
  if (!v.multi) return null;
  const kind = sectionKind(id), t = scopeText(kind, v);
  return (
    <p className="ac-scope-banner" aria-live="polite" data-scope-kind={kind} data-view={v.kind}>
      {t.main}{t.detail && <span className="ac-muted">{t.detail}</span>}
    </p>
  );
}
