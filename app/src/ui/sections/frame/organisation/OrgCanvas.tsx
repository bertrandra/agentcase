import { memo, useId, useMemo, useState } from 'react';
import { addOrgUnit, nextUnitId, removeOrgUnit, updateOrgUnit } from '@/controllers/org';
import { DEFAULT_UNIT_ID, UNIT_TYPES, type OrgUnit } from '@/domain/org';
import { orgGraph, type OrgNode } from '@/domain/org/graph';
import { toast } from '@/ui/uiState';
import { DraftText } from '@/ui/widgets/DraftText';
import { UNIT_LABELS, type OrgParts } from './Units';

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5] as const;

/** The panel of the selected node: a unit is renamed, retyped, given a sub-unit or removed here (one undoable step each); a team is read-only. */
function NodePanel({ m, node, onSelect }: { m: OrgParts; node: OrgNode; onSelect: (id: string | null) => void }) {
  const id = useId();
  if (node.kind === 'team') {
    const text = `Team ${node.label} (${node.sub}): its people come from the team rows (👥 Team in); its unit is set in the Teams table.`;
    return <p className="ac-muted">{text}</p>;
  }
  const u = m.units.find((x) => x.id === node.id) as OrgUnit, n = u.name;
  const addChild = () => {
    const cid = nextUnitId();
    if (addOrgUnit({ id: cid, name: 'New unit', type: 'department', parent: u.id })) { onSelect(cid); toast(`Unit added under ${n} — Ctrl+Z to undo`); }
    else toast('Unit refused: the process document has no collaboration');
  };
  const remove = () => {
    if (removeOrgUnit(u.id)) { onSelect(u.parent ?? null); toast(`Unit ${n} removed — Ctrl+Z to undo`); }
    else toast('Remove the units below it first, and move its teams and products to another unit');
  };
  return (
    <fieldset className="ac-org-canvas-panel">
      <legend>{`Unit ${n}`}</legend>
      <label>Name <DraftText label={`Graph: name of unit ${n}`} value={n}
        onCommit={(v) => { if (!updateOrgUnit(u.id, { name: v })) toast('Name refused'); }} /></label>
      <label htmlFor={`${id}-t`}>Type</label>
      <select id={`${id}-t`} value={u.type} onChange={(e) => { if (!updateOrgUnit(u.id, { type: e.target.value as OrgUnit['type'] })) toast('Type refused'); }}>
        {UNIT_TYPES.map((t) => <option key={t} value={t}>{UNIT_LABELS[t]}</option>)}
      </select>
      <div className="ac-form-row">
        <button type="button" onClick={addChild}>+ Add a unit below</button>
        {!u.derived && <button type="button" onClick={remove}>Remove this unit</button>}
      </div>
    </fieldset>
  );
}

/**
 * 🏢 Organisation › the organisation graph (owner's request 2026-11-02): the units as a tree with their teams as leaves, drawn on a canvas. A node is
 * selected with a click or the keyboard (Tab, Enter / Space); the selected unit is renamed, retyped, given a sub-unit or removed from the panel next
 * to the graph, each one undoable step (the same commands as the units table, the same checks). Zoom with the buttons.
 */
export const OrgCanvas = memo(function OrgCanvas({ m }: { m: OrgParts }) {
  const g = useMemo(() => orgGraph(m, (t) => UNIT_LABELS[t] ?? t), [m]), [selected, setSelected] = useState<string | null>(null), [z, setZ] = useState(2);
  const node = g.nodes.find((n) => n.id === selected) ?? null, zoom = ZOOMS[z] ?? 1;
  const addTop = () => {
    const id = nextUnitId();
    if (addOrgUnit({ id, name: 'New unit', type: 'department', parent: DEFAULT_UNIT_ID })) setSelected(id); else toast('Unit refused');
  };
  return (
    <section aria-labelledby="ac-org-canvas-h" className="ac-org-canvas">
      <h2 id="ac-org-canvas-h">Organisation graph</h2>
      <div className="ac-form-row" role="toolbar" aria-label="Organisation graph">
        <button type="button" aria-label="Zoom out" disabled={z === 0} onClick={() => setZ(z - 1)}>−</button>
        <button type="button" aria-label="Zoom in" disabled={z === ZOOMS.length - 1} onClick={() => setZ(z + 1)}>+</button>
        <span className="ac-muted">{`${Math.round(zoom * 100)}%`}</span>
        <button type="button" onClick={addTop}>+ New unit on the graph</button>
        <p className="ac-proc-live" aria-live="polite">{node ? `Selected: ${node.kind} ${node.label}` : 'No node selected'}</p>
      </div>
      <div className="ac-org-canvas-row">
        <div className="ac-org-canvas-frame">
          <svg width={g.box.w * zoom} height={g.box.h * zoom} viewBox={`0 0 ${g.box.w} ${g.box.h}`} role="group" aria-label="Units and teams">
            {g.edges.map((e) => <polyline key={`${e.from}>${e.to}`} className="ac-org-edge" points={e.points.map((p) => p.join(',')).join(' ')} />)}
            {g.nodes.map((n) => { const shown = n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label; return (
              <g key={n.id} role="button" tabIndex={0} aria-pressed={n.id === selected}
                aria-label={`${shown} ${n.sub} · ${n.kind === 'unit' ? 'unit' : 'team'} ${n.label}`}
                className={`ac-org-node is-${n.kind}${n.id === selected ? ' is-selected' : ''}`} onClick={() => setSelected(n.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(n.id); } }}>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={n.kind === 'unit' ? 8 : 20} />
                <text x={n.x + n.w / 2} y={n.y + 24} textAnchor="middle">
                  <tspan x={n.x + n.w / 2}>{shown}</tspan>{' '}<tspan x={n.x + n.w / 2} dy={18} className="ac-org-sub">{n.sub}</tspan>
                </text>
              </g>
            ); })}
          </svg>
        </div>
        {node ? <NodePanel m={m} node={node} onSelect={setSelected} /> : <p className="ac-muted">Select a unit to rename it, change its type, add a unit
          below it or remove it.</p>}
      </div>
    </section>
  );
});
