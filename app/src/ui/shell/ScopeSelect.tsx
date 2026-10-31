import { setDisplayScope, showProduct } from '@/controllers/displayScope';
import { UNASSIGNED } from '@/domain/org';
import { UNASSIGNED_UNIT } from '@/domain/portfolio';
import { useDisplayScope, useUnitNodes, type UnitNode } from '@/store/consolidationHooks';
import { useActiveProductId, useProducts, useWaves } from '@/store/portfolioHooks';
import { toast } from '../uiState';

/** The level of a unit in the tree, as announced (1 = a root). */
const levelOf = (depth: number): string => `level ${depth + 1}`;
/** A unit option: indented by its depth (the indentation stops growing at 6, as in 🏢 Organisation); its accessible name states the level. */
const unitOption = (u: UnitNode) => (
  <option key={u.id} value={`unit:${u.id}`} aria-label={`${u.name}, unit ${levelOf(u.depth)}`}>{`${'· '.repeat(Math.min(u.depth, 6))}${u.name}`}</option>
);

/**
 * "👁 Show": the single selector of the top bar. It picks what the headline bar, the Gantt and the report show — the Portfolio, a Wave, a Unit of the
 * organisation tree at any level (F-B81: the products it owns directly or through its sub-units; "Unassigned" for the products without an owner)
 * or a Product — and "Change follows Show" (F17 revised): a Product also becomes the edited product and the edit target; the Portfolio, a Wave or a
 * Unit sets the edit target back to All products (`controllers/displayScope.ts`). View state: not undoable, not saved. Native list (arrow keys,
 * type-ahead); announced in the live region ("Showing X", with the unit's level).
 */
export function ScopeSelect() {
  const scope = useDisplayScope(), products = useProducts(), waves = useWaves(), active = useActiveProductId(), units = useUnitNodes();
  const value = scope.kind === 'portfolio' ? 'portfolio' : scope.kind === 'wave' || scope.kind === 'unit' ? `${scope.kind}:${scope.id}` : `product:${active}`;
  const pick = (v: string) => {
    const at = v.indexOf(':'), kind = at < 0 ? v : v.slice(0, at), id = at < 0 ? '' : v.slice(at + 1);
    if (kind === 'portfolio') { if (setDisplayScope({ kind: 'portfolio' })) toast('Showing Portfolio'); }
    else if (kind === 'wave') { if (setDisplayScope({ kind: 'wave', id })) toast(`Showing ${waves.find((w) => w.id === id)?.name ?? id}`); }
    else if (kind === 'unit') {
      const u = units.find((x) => x.id === id);
      const said = id === UNASSIGNED_UNIT ? `Showing ${UNASSIGNED} products` : `Showing unit ${u?.name ?? id}, ${levelOf(u?.depth ?? 0)}`;
      if (setDisplayScope({ kind: 'unit', id })) toast(said);
    } else if (showProduct(id)) toast(`Showing ${products.find((p) => p.id === id)?.name ?? id}`);
  };
  const waveOf = (id: string | null) => waves.find((w) => w.id === id)?.name ?? 'unscheduled';
  return (
    <label className="ac-prodsel ac-scopesel" title="What you look at: the portfolio, a wave, a unit or one product">
      <span className="ac-prodsel-icon" aria-hidden="true">👁</span>Show{' '}
      <select aria-label="Show" value={value} onChange={(e) => pick(e.target.value)}>
        <option value="portfolio">Portfolio</option>
        <optgroup label="Waves">{waves.map((w) => <option key={w.id} value={`wave:${w.id}`}>{w.name}</option>)}</optgroup>
        <optgroup label="Units">{units.map(unitOption)}<option value={`unit:${UNASSIGNED_UNIT}`}>{UNASSIGNED}</option></optgroup>
        <optgroup label="Products">
          {products.map((p) => <option key={p.id} value={`product:${p.id}`}>{p.name} ({waveOf(p.waveId)}){p.archived ? ' (archived)' : ''}</option>)}</optgroup>
      </select>
    </label>
  );
}
