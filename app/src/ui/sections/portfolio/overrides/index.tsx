import { useActiveProductId, useCommon, useProducts } from '@/store/portfolioHooks';
import { Callout } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { ProductOverrides } from './ProductOverrides';

const help = (
  <>
    <p>A product <strong>inherits</strong> every shareable value of the common case until it takes its own: scope (artefacts, norms, phases), adoption curve, engagement context, location mix and
      the form fields of the parameters. Only the keys that differ are stored.</p>
    <p><strong>Revenir au commun</strong> makes the product follow the common value again. <strong>Appliquer à tous les produits</strong> turns the product&apos;s value into the common one and drops
      every override identical to it. The entry team, the rate card, the model and the discount rate are never overridden.</p>
  </>
);

/** Surcharges — per product, the overridden keys with their common and product values, back to common and apply to all. */
export default function OverridesSection() {
  const products = useProducts(), common = useCommon(), active = useActiveProductId();
  return (
    <SectionFrame title="🧬 Surcharges" help={help}
      input={<Callout>Pour surcharger une valeur, choisissez « Ce produit seulement » dans la barre haute (mode Modifier) puis modifiez-la dans sa section : une puce « surchargé » apparaît.</Callout>}
      result={<>{products.map((p) => <ProductOverrides key={p.id} product={p} common={common} active={p.id === active} />)}</>} />
  );
}
