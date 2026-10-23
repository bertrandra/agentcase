import { useState } from 'react';
import { addGroup, deleteGroup, renameGroup, setGroupColor, setGroupDescription, setGroupOrder } from '@/controllers/pdcPersonas';
import { groupsByOrder, type MenuGroup } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';
import { tok } from '@/domain/theme';

const hex = (c: string | undefined) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : tok('slate-600'));

/** Menu groups of one menu structure: order, label, colour, section count, description (shown on the Welcome cards). A group still holding sections cannot be deleted. */
export function GroupTable({ structure }: { structure: string }) {
  const { own: groups, colors, sections: SECTIONS } = useNavModel().view(structure), st = structure;
  const [renaming, setRenaming] = useState<string | null>(null), [text, setText] = useState(''), [pending, setPending] = useState<string | null>(null), [label, setLabel] = useState(''), [warn, setWarn] = useState('');
  const commit = (id: string) => { renameGroup(id, text, st); setRenaming(null); };
  const del = (g: MenuGroup) => {
    const inUse = SECTIONS.filter((s) => s.group === g.id);
    if (inUse.length) { setWarn(`Cannot delete “${g.label}” — ${inUse.length} section(s) still assigned to it (e.g. ${inUse[0]!.id}). Reassign them to another group first.`); return; }
    setWarn(''); setPending(g.id);
  };
  return (
    <>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>Order</th><th>ID</th><th>Label</th><th>Colour</th><th>Sections</th><th>Description</th><th>Actions</th></tr></thead>
        <tbody>
          {groupsByOrder(groups).map((g) => {
            const n = SECTIONS.filter((s) => s.group === g.id).length;
            return (
              <tr key={g.id}>
                <td style={{ textAlign: 'center' }}><input type="number" aria-label={`Order of ${g.id}`} style={{ width: 60, textAlign: 'center' }} value={g.order} onChange={(e) => setGroupOrder(g.id, parseFloat(e.target.value), st)} /></td>
                <td><code>{g.id}</code></td>
                <td>{renaming === g.id ? <input type="text" aria-label="New group label" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit(g.id); if (e.key === 'Escape') setRenaming(null); }} /> : g.label}</td>
                <td style={{ textAlign: 'center' }}><input type="color" aria-label={`Colour of ${g.id}`} value={hex(colors[g.id])} onChange={(e) => setGroupColor(g.id, e.target.value, st)} /></td>
                <td style={{ textAlign: 'center', fontWeight: 'var(--ac-font-weight-bold)', color: n ? 'var(--ac-primary-700)' : 'var(--ac-neutral-700)' }}>{n}</td>
                <td><input type="text" aria-label={`Description of ${g.id}`} placeholder="Shown on the 🏠 Welcome card" style={{ width: '100%', minWidth: 220 }} value={g.description ?? ''} onChange={(e) => setGroupDescription(g.id, e.target.value, st)} /></td>
                <td>{renaming === g.id ? <><button type="button" className="ac-btn" onClick={() => commit(g.id)}>✓ Save</button><button type="button" className="ac-btn" onClick={() => setRenaming(null)}>Cancel</button></>
                  : pending === g.id ? <><span style={{ color: 'var(--ac-danger-800)', fontSize: 'var(--ac-font-size-sm)' }}>Delete “{g.label}”?</span><button type="button" className="ac-btn" onClick={() => { deleteGroup(g.id, st); setPending(null); }}>✓ Confirm</button><button type="button" className="ac-btn" onClick={() => setPending(null)}>Cancel</button></>
                    : <><button type="button" className="ac-btn" onClick={() => { setText(g.label); setRenaming(g.id); }}>✎ Rename</button><button type="button" className="ac-btn" onClick={() => del(g)}>✕ Delete</button></>}</td>
              </tr>
            );
          })}
        </tbody>
      </table></div>
      {warn && <p role="alert" style={{ color: 'var(--ac-danger-800)' }}>{warn}</p>}
      <div className="ac-form-row">
        <label className="ac-field"><span className="ac-field-l">Add group (label)</span><input type="text" placeholder="e.g. Compliance" value={label} onChange={(e) => setLabel(e.target.value)} /></label>
        <button type="button" className="ac-btn" onClick={() => { if (label.trim()) { addGroup(label, st); setLabel(''); } }}>➕ Add</button>
      </div>
    </>
  );
}
