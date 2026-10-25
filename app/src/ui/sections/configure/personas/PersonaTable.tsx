import { useState } from 'react';
import { addPersona, deletePersona, duplicatePersona, renamePersona, setDefaultPersona, setPersonaCompactNav, setPersonaOrder } from '@/controllers/pdcPersonas';
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';
import { ConfirmDelete, ListTable, OrderInput, RenameInput } from './cells';


/** The table head; a note inside the blue header band reads in its own token (5.08:1). */
const HEAD = (
  <>
    <th>Order</th><th>ID</th><th>Label</th><th>Protected</th>
    <th>Hide menu <span className="ac-th-note">(compact group nav)</span></th>
    <th>Default <span className="ac-th-note">(opens on load)</span></th>
    <th>Actions</th>
  </>
);

/** Personas in picker order: order, hide-menu and default flags, duplicate / rename / delete (delete asks for confirmation). */
export function PersonaTable({ personas }: { personas: Persona[] }) {
  const SECTIONS = useNavModel().sections;
  const [renaming, setRenaming] = useState<string | null>(null), [text, setText] = useState(''), [pending, setPending] = useState<string | null>(null), [label, setLabel] = useState('');
  const commit = (id: string) => { renamePersona(id, text); setRenaming(null); };
  return (
    <>
      <ListTable head={HEAD}>
        {personasByOrder(personas).map((p) => (
          <tr key={p.id}>
            <td className="ac-c">{p.protected ? p.order : <OrderInput id={p.id} value={p.order} onChange={(o) => setPersonaOrder(p.id, o)} />}</td>
            <td><code>{p.id}</code></td>
            <td>{renaming === p.id
              ? <RenameInput label="New label" value={text} onChange={setText} onCommit={() => commit(p.id)} onCancel={() => setRenaming(null)} />
              : <strong>{p.label}</strong>}</td>
            <td className="ac-c">{p.protected ? <span className="ac-tag-text">🔒 yes</span> : 'no'}</td>
            <td className="ac-c">
              <input type="checkbox" aria-label={`Hide menu for ${p.id}`} checked={!!p.compactNav} onChange={(e) => setPersonaCompactNav(p.id, e.target.checked)} />
            </td>
            <td className="ac-c"><input type="radio" name="defaultPersona" aria-label={`Default persona ${p.id}`} checked={!!p.default} onChange={() => setDefaultPersona(p.id)} /></td>
            <td>{renaming === p.id
              ? <><button type="button" className="ac-btn" onClick={() => commit(p.id)}>✓ Save</button><button type="button" className="ac-btn" onClick={() => setRenaming(null)}>Cancel</button></>
              : pending === p.id
                ? <ConfirmDelete name={p.label} onConfirm={() => { deletePersona(p.id); setPending(null); }} onCancel={() => setPending(null)} />
                : <><button type="button" className="ac-btn" title="Create a new persona with a copy of this one’s menu membership and guided sequence (order and compact-nav are not copied)" onClick={() => duplicatePersona(p.id, SECTIONS.map((s) => s.id))}>⎘ Duplicate</button>
                  {!p.protected && <><button type="button" className="ac-btn" onClick={() => { setText(p.label); setRenaming(p.id); }}>✎ Rename</button><button type="button" className="ac-btn" onClick={() => setPending(p.id)}>✕ Delete</button></>}</>}</td>
          </tr>
        ))}
      </ListTable>
      <div className="ac-form-row">
        <label className="ac-field"><span className="ac-field-l">Add persona (label)</span><input type="text" placeholder="e.g. Executive" value={label} onChange={(e) => setLabel(e.target.value)} /></label>
        <button type="button" className="ac-btn" onClick={() => { if (label.trim()) { addPersona(label); setLabel(''); } }}>➕ Add</button>
      </div>
    </>
  );
}
