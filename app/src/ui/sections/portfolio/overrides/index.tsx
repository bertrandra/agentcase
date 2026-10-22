import { useActiveProductId, useCommon, useProducts } from '@/store/portfolioHooks';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ProductOverrides } from './ProductOverrides';

const help = (
  <>
    <p>A product <strong>inherits</strong> every shareable value of the common case until it takes its own: scope (artefacts, norms, phases), adoption curve, engagement context, location mix and
      the form fields of the parameters. Only the keys that differ are stored.</p>
    <p><strong>Revert to common</strong> makes the product follow the common value again. <strong>Apply to all products</strong> turns the product&apos;s value into the common one and drops
      every override identical to it. The entry team, the rate card, the model and the discount rate are never overridden.</p>
  </>
);

/** Overrides — per product, the overridden keys with their common and product values, back to common and apply to all. */
export default function OverridesSection() {
  const products = useProducts(), common = useCommon(), active = useActiveProductId();
  return (
    <SectionFrame title="🧬 Overrides" help={help}
      input={<Callout>To override a value, choose “This product only” in the top bar (Edit mode), then change it in its section: an “overridden” chip appears.</Callout>}
      result={<>{products.map((p) => <ProductOverrides key={p.id} product={p} common={common} active={p.id === active} />)}</>} />
  );
}
