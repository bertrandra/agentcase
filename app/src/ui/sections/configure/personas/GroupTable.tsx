import { useState } from 'react';
import { addGroup, deleteGroup, renameGroup, setGroupColor, setGroupDescription, setGroupOrder } from '@/controllers/pdcPersonas';
import { groupsByOrder, type MenuGroup } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';
import { ConfirmDelete, ListTable, OrderInput, RenameInput } from './cells';
import { useTheme } from '@/ui/themeContext';
import type { Tok } from '@/domain/theme/resolve';

const hex = (c: string | undefined, tok: Tok) => (c && /^#[0-9a-fA-F]{6}$/.test(c) ? c : tok('slate-600'));

/**
 * Menu groups of one menu structure: order, label, colour, section count, description (shown on the Welcome cards). A group still holding sections
 * cannot be deleted.
 */
export function GroupTable({ structure }: { structure: string }) {
  const { own: groups, colors, sections: SECTIONS } = useNavModel().view(structure), st = structure, { tok } = useTheme();
  const [renaming, setRenaming] = useState<string | null>(null), [text, setText] = useState(''), [pending, setPending] = useState<string | null>(null),
    [label, setLabel] = useState(''), [warn, setWarn] = useState('');
  const commit = (id: string) => { renameGroup(id, text, st); setRenaming(null); };
  const del = (g: MenuGroup) => {
    const inUse = SECTIONS.filter((s) => s.group === g.id);
    if (inUse.length) {
      setWarn(`Cannot delete “${g.label}” — ${inUse.length} section(s) still assigned to it (e.g. ${inUse[0]!.id}). Reassign them to another group first.`);
      return;
    }
    setWarn(''); setPending(g.id);
  };
  return (
    <>
      <ListTable head={<><th>Order</th><th>ID</th><th>Label</th><th>Colour</th><th>Sections</th><th>Description</th><th>Actions</th></>}>
        {groupsByOrder(groups).map((g) => {
          const n = SECTIONS.filter((s) => s.group === g.id).length;
          return (
            <tr key={g.id}>
              <td className="ac-c"><OrderInput id={g.id} value={g.order} onChange={(o) => setGroupOrder(g.id, o, st)} /></td>
              <td><code>{g.id}</code></td>
              <td>{renaming === g.id ? <RenameInput
                label="New group label"
                value={text}
                onChange={setText}
                onCommit={() => commit(g.id)}
                onCancel={() => setRenaming(null)}
              /> : g.label}</td>
              <td className="ac-c"><input
                type="color"
                aria-label={`Colour of ${g.id}`}
                value={hex(colors[g.id], tok)}
                onChange={(e) => setGroupColor(g.id, e.target.value, st)}
              /></td>
              <td className={n ? 'ac-c ac-grp-count' : 'ac-c ac-grp-count is-zero'}>{n}</td>
              <td><input
                type="text"
                aria-label={`Description of ${g.id}`}
                placeholder="Shown on the 🏠 Welcome card"
                className="ac-grp-desc"
                value={g.description ?? ''}
                onChange={(e) => setGroupDescription(g.id, e.target.value, st)}
              /></td>
              <td>{renaming === g.id ? <><button type="button" className="ac-btn" onClick={() => commit(g.id)}>✓ Save</button><button
                type="button"
                className="ac-btn"
                onClick={() => setRenaming(null)}
              >Cancel</button></>
                : pending === g.id ? <ConfirmDelete
                  name={g.label}
                  onConfirm={() => { deleteGroup(g.id, st); setPending(null); }}
                  onCancel={() => setPending(null)}
                />
                  : <><button type="button" className="ac-btn" onClick={() => { setText(g.label); setRenaming(g.id); }}>✎ Rename</button><button
                    type="button"
                    className="ac-btn"
                    onClick={() => del(g)}
                  >✕ Delete</button></>}</td>
            </tr>
          );
        })}
      </ListTable>
      {warn && <p role="alert" className="ac-alert-text">{warn}</p>}
      <div className="ac-form-row">
        <label className="ac-field"><span className="ac-field-l">Add group (label)</span><input
          type="text"
          placeholder="e.g. Compliance"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        /></label>
        <button type="button" className="ac-btn" onClick={() => { if (label.trim()) { addGroup(label, st); setLabel(''); } }}>➕ Add</button>
      </div>
    </>
  );
}
