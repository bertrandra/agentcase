import { Suspense, useId, type ComponentType } from 'react';
import { COMMON_VIEW, ProductViewProvider } from '@/store/productView';
import { useActiveProduct, useEditScope } from '@/store/portfolioHooks';
import { useViewScope } from '@/store/viewScope';
import { Callout } from '../widgets/cards';
import { EmbedLevel } from './EmbeddedFrame';

/** Sections whose data is always a product's own (the address layer writes it to the active product): not editable for "All products". */
const PRODUCT_ONLY = new Set(['team-in']);

/**
 * The input section itself, EDITABLE in place below its aggregate summary when a Portfolio or a Wave is in view (docs/VUE_AGREGEE.md § 2), bound to
 * the top-bar "Edit" choice:
 *  - a product: the real section for that (active) product, as in its Product view; its edits create overrides for it;
 *  - All products: the real section on the COMMON values every product inherits (`COMMON_VIEW`); edits go to the common values (the store runs the
 *    commands on the common case, `store/commonEdit.ts`); each field some products override names them (`KeepersNotice`).
 * Rendered embedded (no h1; zones named after what is edited). Product-only data (the entry team) only gets a hint for "All products".
 */
export function InPlaceEdit({ id, Section }: { id: string; Section: ComponentType }) {
  const all = useEditScope() === 'all', prod = useActiveProduct(), vs = useViewScope(), head = useId();
  const where = vs.kind === 'wave' ? `Wave ${vs.label}` : 'Portfolio';
  const title = all ? 'Edit in place: All products (common values)' : `Edit in place: ${prod.name} only`;
  let body;
  if (all && PRODUCT_ONLY.has(id)) {
    body = <Callout kind="blue">The team is per product — pick a product in Edit to change it.</Callout>;
  } else {
    body = (
      <>
        <p className="ac-inplace-banner" role="note">
          {all ? <>Editing the <strong>common values</strong>: every product that inherits a value follows; products with their own value keep it.
            Figures in this editor use the team of {prod.name}.</>
            : <>Editing <strong>{prod.name}</strong> only — results above and elsewhere still show the {where} view.</>}
        </p>
        <EmbedLevel.Provider value={3}>
          <ProductViewProvider productId={all ? COMMON_VIEW : prod.id}>
            <Suspense fallback={<p className="ac-muted">Loading…</p>}><Section /></Suspense>
          </ProductViewProvider>
        </EmbedLevel.Provider>
      </>
    );
  }
  return (
    <section className="ac-inplace" aria-labelledby={head} data-edit={all ? 'all' : prod.id}>
      <h2 id={head}>{title}</h2>
      {body}
    </section>
  );
}
