import { useState } from 'react';
import { addPersona, deletePersona, duplicatePersona, renamePersona, setDefaultPersona, setPersonaCompactNav, setPersonaOrder } from '@/controllers/pdcPersonas';
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { SECTIONS } from '@/ui/zones/registry';

const note = { fontWeight: 400, color: '#888', fontSize: 10 } as const;

/** Personas in picker order: order, hide-menu and default flags, duplicate / rename / delete (delete asks for confirmation). */
export function PersonaTable({ personas }: { personas: Persona[] }) {
  const [renaming, setRenaming] = useState<string | null>(null), [text, setText] = useState(''), [pending, setPending] = useState<string | null>(null), [label, setLabel] = useState('');
  const commit = (id: string) => { renamePersona(id, text); setRenaming(null); };
  return (
    <>
      <div className="ac-table-wrap"><table className="ac-table">
        <thead><tr><th>Order</th><th>ID</th><th>Label</th><th>Protected</th><th>Hide menu <span style={note}>(compact group nav)</span></th><th>Default <span style={note}>(opens on load)</span></th><th>Actions</th></tr></thead>
        <tbody>
          {personasByOrder(personas).map((p) => (
            <tr key={p.id}>
              <td style={{ textAlign: 'center' }}>{p.protected ? p.order : <input type="number" aria-label={`Order of ${p.id}`} style={{ width: 60, textAlign: 'center' }} value={p.order} onChange={(e) => setPersonaOrder(p.id, parseFloat(e.target.value))} />}</td>
              <td><code>{p.id}</code></td>
              <td>{renaming === p.id
                ? <input type="text" aria-label="New label" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') commit(p.id); if (e.key === 'Escape') setRenaming(null); }} />
                : <strong>{p.label}</strong>}</td>
              <td style={{ textAlign: 'center' }}>{p.protected ? <span style={{ color: '#BE4D00' }}>🔒 yes</span> : 'no'}</td>
              <td style={{ textAlign: 'center' }}><input type="checkbox" aria-label={`Hide menu for ${p.id}`} checked={!!p.compactNav} onChange={(e) => setPersonaCompactNav(p.id, e.target.checked)} /></td>
              <td style={{ textAlign: 'center' }}><input type="radio" name="defaultPersona" aria-label={`Default persona ${p.id}`} checked={!!p.default} onChange={() => setDefaultPersona(p.id)} /></td>
              <td>{renaming === p.id
                ? <><button type="button" className="ac-btn" onClick={() => commit(p.id)}>✓ Save</button><button type="button" className="ac-btn" onClick={() => setRenaming(null)}>Cancel</button></>
                : pending === p.id
                  ? <><span style={{ color: '#8F3237', fontSize: 11 }}>Delete “{p.label}”?</span><button type="button" className="ac-btn" onClick={() => { deletePersona(p.id); setPending(null); }}>✓ Confirm</button><button type="button" className="ac-btn" onClick={() => setPending(null)}>Cancel</button></>
                  : <><button type="button" className="ac-btn" title="Create a new persona with a copy of this one’s menu membership and guided sequence (order and compact-nav are not copied)" onClick={() => duplicatePersona(p.id, SECTIONS.map((s) => s.id))}>⎘ Duplicate</button>
                    {!p.protected && <><button type="button" className="ac-btn" onClick={() => { setText(p.label); setRenaming(p.id); }}>✎ Rename</button><button type="button" className="ac-btn" onClick={() => setPending(p.id)}>✕ Delete</button></>}</>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="ac-form-row">
        <label className="ac-field"><span className="ac-field-l">Add persona (label)</span><input type="text" placeholder="e.g. Executive" value={label} onChange={(e) => setLabel(e.target.value)} /></label>
        <button type="button" className="ac-btn" onClick={() => { if (label.trim()) { addPersona(label); setLabel(''); } }}>➕ Add</button>
      </div>
    </>
  );
}
