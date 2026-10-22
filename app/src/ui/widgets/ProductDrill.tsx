import { Suspense, useId, useState, type ComponentType } from 'react';
import { ProductViewProvider } from '@/store/productView';
import { useProducts } from '@/store/portfolioHooks';
import { editProduct } from './AggregateTable';
import { ReadOnlyScope } from './ReadOnlyScope';

function Item({ id, name, Section }: { id: string; name: string; Section: ComponentType }) {
  const [open, setOpen] = useState(false), panel = useId();
  return (
    <li className="ac-drill-item" data-product={id}>
      <div className="ac-drill-head">
        <h3><button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} {name}</button></h3>
        <button type="button" aria-label={`Edit this product: ${name}`} onClick={() => editProduct(id, name)}>Edit this product</button>
      </div>
      {open && (
        <div id={panel} role="region" aria-label={`Detail: ${name}`} className="ac-drill-body" tabIndex={0}>
          <ProductViewProvider productId={id}>
            <ReadOnlyScope who={name}><Suspense fallback={<p className="ac-muted">Loading…</p>}><Section /></Suspense></ReadOnlyScope>
          </ProductViewProvider>
        </div>
      )}
    </li>
  );
}

/**
 * Drill-down of a aggregate view: one collapsible entry per product of the selection that renders the section's OWN component for that product
 * (`ProductViewContext`: it reads the product's resolved case, not the edited one), read-only. Lazy: only an opened product is rendered.
 */
export function ProductDrill({ Section, productIds, heading = 'Detail by product' }: { Section: ComponentType; productIds: string[]; heading?: string }) {
  const products = useProducts();
  const items = productIds.flatMap((id) => { const p = products.find((x) => x.id === id); return p ? [{ id, name: p.name }] : []; });
  if (!items.length) return null;
  return (
    <section className="ac-drill" aria-label={heading}>
      <h2>{heading}</h2>
      <ul className="ac-drill-list">{items.map((i) => <Item key={i.id} id={i.id} name={i.name} Section={Section} />)}</ul>
    </section>
  );
}
