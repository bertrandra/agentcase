interface Named { id: string; name: string }

/** The Waves group of an export-scope select (`wave:<id>` values). */
export function WaveOptions({ waves }: { waves: Named[] }) {
  return <optgroup label="Waves">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>Wave: {w.name}</option>)}</optgroup>;
}

/** The Products group of an export-scope select (`product:<id>` values); a product `unplanned` flags is greyed out, "(no wave)". */
export function ProductOptions<T extends Named>({ products, unplanned }: { products: T[]; unplanned?: (p: T) => boolean }) {
  const option = (p: T) => {
    const off = unplanned?.(p);
    return <option key={p.id} value={`product:${p.id}`} disabled={off}>Product: {p.name}{off ? ' (no wave)' : ''}</option>;
  };
  return <optgroup label="Products">{products.map(option)}</optgroup>;
}
