import { addOrgUnit, nextUnitId, removeOrgUnit, updateOrgUnit } from '@/controllers/org';
import { DEFAULT_UNIT_ID, isBelow, SOURCINGS, UNIT_TYPES, unitTree, type OrgModel, type OrgUnit, type UnitPatch } from '@/domain/org';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';

/** Labels of the unit types and sourcing values (the document stores the codes of the extension XSD). */
export const UNIT_LABELS: Record<string, string> = { company: 'Company', businessUnit: 'Business unit', department: 'Department',
  centreOfExcellence: 'Centre of excellence', vendor: 'Vendor / partner', offshoreCentre: 'Offshore centre', nearshoreCentre: 'Near-shore centre',
  other: 'Other' };
const SOURCING_LABELS: Record<string, string> = { internal: 'Internal', vendor: 'Vendor', either: 'Either' };

function edit(id: string, patch: UnitPatch, what: string): void {
  if (!updateOrgUnit(id, patch)) toast(`${what} refused`);
}

function UnitRow({ m, unit, depth }: { m: OrgModel; unit: OrgUnit; depth: number }) {
  const parents = m.units.filter((u) => !isBelow(m, u.id, unit.id)), n = unit.name;
  const remove = () => toast(removeOrgUnit(unit.id) ? `Unit ${n} removed — Ctrl+Z to undo` : 'Remove the units below it first');
  return (
    <tr>
      <th scope="row" className="ac-org-name" data-depth={Math.min(depth, 6)}>
        <span className="ac-sr">{`Level ${depth + 1}: `}</span>
        <DraftText label={`Name of unit ${n}`} value={n} onCommit={(v) => edit(unit.id, { name: v }, 'Name')} />
        {unit.derived && <span className="ac-muted"> (default)</span>}
      </th>
      <td><select aria-label={`Type of ${n}`} value={unit.type} onChange={(e) => edit(unit.id, { type: e.target.value as OrgUnit['type'] }, 'Type')}>
        {UNIT_TYPES.map((t) => <option key={t} value={t}>{UNIT_LABELS[t]}</option>)}
      </select></td>
      <td><select aria-label={`Parent of ${n}`} value={unit.parent ?? ''} onChange={(e) => edit(unit.id, { parent: e.target.value || undefined }, 'Parent')}>
        <option value="">— none —</option>
        {parents.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select></td>
      <td><DraftText label={`Location of ${n}`} value={unit.location ?? ''}
        onCommit={(v) => edit(unit.id, { location: v.trim() || undefined }, 'Location')} /></td>
      <td><DraftText label={`Cost centre of ${n}`} value={unit.costCentre ?? ''}
        onCommit={(v) => edit(unit.id, { costCentre: v.trim() || undefined }, 'Cost centre')} /></td>
      <td><select aria-label={`Sourcing of ${n}`} value={unit.sourcing ?? ''}
        onChange={(e) => edit(unit.id, { sourcing: (e.target.value || undefined) as OrgUnit['sourcing'] }, 'Sourcing')}>
        <option value="">—</option>
        {SOURCINGS.map((s) => <option key={s} value={s}>{SOURCING_LABELS[s]}</option>)}
      </select></td>
      <td>{!unit.derived && <button type="button" aria-label={`Remove unit ${n}`} onClick={remove}>✕</button>}</td>
    </tr>
  );
}

/** The organisation units as a tree (keyboard-editable table: every cell is a control; the level is announced). */
export function Units({ m }: { m: OrgModel }) {
  const add = () => toast(addOrgUnit({ id: nextUnitId(), name: 'New unit', type: 'department', parent: DEFAULT_UNIT_ID })
    ? 'Unit added under the delivery unit — Ctrl+Z to undo' : 'Unit refused: the process document has no collaboration');
  return (
    <section aria-labelledby="ac-org-units-h">
      <h2 id="ac-org-units-h">Organisation units</h2>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <caption>Units ({m.units.length}), parents before their children</caption>
          <thead><tr>
            <th scope="col">Unit</th><th scope="col">Type</th><th scope="col">Parent</th><th scope="col">Location</th><th scope="col">Cost centre</th>
            <th scope="col">Sourcing</th><th scope="col"><span className="ac-sr">Remove</span></th>
          </tr></thead>
          <tbody>{unitTree(m).map(({ unit, depth }) => <UnitRow key={unit.id} m={m} unit={unit} depth={depth} />)}</tbody>
        </table>
      </div>
      <div className="ac-form-row"><button type="button" onClick={add}>+ Add a unit</button></div>
    </section>
  );
}
