import { UNASSIGNED } from '@/domain/org';
import { UNASSIGNED_UNIT } from '@/domain/portfolio';
import type { UnitNode } from '@/store/consolidationHooks';

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

/** The Units group of an export-scope select (`unit:<id>` values, F-B81): the unit tree indented by depth (level in the accessible name), then Unassigned. */
export function UnitOptions({ units }: { units: UnitNode[] }) {
  return (
    <optgroup label="Units">
      {units.map((u) => <option key={u.id} value={`unit:${u.id}`} aria-label={`Unit: ${u.name}, level ${u.depth + 1}`}>
        {`Unit: ${'· '.repeat(u.depth)}${u.name}`}</option>)}
      <option value={`unit:${UNASSIGNED_UNIT}`}>Unit: {UNASSIGNED}</option>
    </optgroup>
  );
}

/** "portfolio" | "wave:<id>" | "unit:<id>" | "product:<id>": the scope value a selector holds for a display scope. */
export const scopeValue = (d: { kind: string; id?: string }, active: string): string =>
  (d.kind === 'portfolio' ? 'portfolio' : d.kind === 'wave' || d.kind === 'unit' ? `${d.kind}:${d.id ?? ''}` : `product:${active}`);
/** The kind and the id of a scope value (an id may hold ':'). */
export const splitScope = (v: string): { kind: string; id: string } => {
  const at = v.indexOf(':');
  return at < 0 ? { kind: v, id: '' } : { kind: v.slice(0, at), id: v.slice(at + 1) };
};
