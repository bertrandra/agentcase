import { setProductOwner } from '@/controllers/org';
import { UNASSIGNED, unitTree, type OrgUnit } from '@/domain/org';
import { toast } from '@/ui/uiState';

/**
 * A product's owning unit (docs/SPEC_BPMN.md § 21, F-B80, D-B39): one unit at any level of the tree (indented by its depth), or "Unassigned".
 * Each change is one undoable step (a node patch of the common document).
 */
export function OwnerSelect({ productId, name, owner, units }: { productId: string; name: string; owner?: string; units: readonly OrgUnit[] }) {
  const change = (v: string) => toast(setProductOwner(productId, v || null)
    ? `${name}: ${v ? `owned by ${units.find((u) => u.id === v)?.name ?? v}` : UNASSIGNED.toLowerCase()} — Ctrl+Z to undo` : 'Owning unit refused');
  return (
    <select aria-label={`Owning unit of ${name}`} value={owner ?? ''} onChange={(e) => change(e.target.value)}>
      <option value="">{UNASSIGNED}</option>
      {unitTree({ units: [...units] }).map(({ unit, depth }) => <option key={unit.id} value={unit.id}>{`${'· '.repeat(depth)}${unit.name}`}</option>)}
    </select>
  );
}
