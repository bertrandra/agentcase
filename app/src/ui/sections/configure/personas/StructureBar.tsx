import { useState } from 'react';
import { deleteStructure, duplicateStructure, renameStructure } from '@/controllers/menuStructures';
import { personasUsing, snapshotStructure, STANDARD_STRUCTURE } from '@/domain/nav/structures';
import { uniqueId } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';

/**
 * The menu structure the Menu groups, Sections and Menu layout tabs edit (DEV-MENU-STRUCTURES): pick one, create one as a copy of the picked one,
 * rename it, delete it when no persona navigates with it. Standard and the shipped structures cannot be deleted; Standard cannot be renamed.
 */
export function StructureBar({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const m = useNavModel(), cur = m.structures.find((s) => s.id === value) ?? m.structures[0]!, users = personasUsing(m.personas, cur.id);
  const [mode, setMode] = useState<'new' | 'rename' | 'delete' | null>(null), [text, setText] = useState('');
  const open = (k: 'new' | 'rename' | 'delete') => { setMode(k); setText(k === 'new' ? `${cur.label} (copy)` : k === 'rename' ? cur.label : ''); };
  const create = () => {
    const v = m.view(cur.id), label = text.trim(), id = uniqueId(label, m.structures.map((s) => s.id));
    if (!label || !id) return;
    duplicateStructure(label, snapshotStructure(cur.id, cur.label, v.own, v.colors, v.all));
    setMode(null); onChange(id);
  };
  const rename = () => { if (text.trim()) renameStructure(cur.id, text); setMode(null); };
  const blocked = cur.builtin ? 'A built-in structure cannot be deleted' : users.length ? `Still used by ${users.map((p) => p.label).join(', ')}` : '';
  const field = (go: () => void) => (
    <input type="text" aria-label="Menu structure name" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(); if (e.key === 'Escape') setMode(null); }} />
  );
  return (
    <div className="ac-callout-blue" role="group" aria-label="Menu structure">
      <div className="ac-form-row" style={{ alignItems: 'flex-end' }}>
        <label className="ac-field"><span className="ac-field-l">Menu structure</span>
          <select value={cur.id} onChange={(e) => { onChange(e.target.value); setMode(null); }}>{m.structures.map((s) => <option key={s.id} value={s.id}>{s.label}{s.builtin ? ' (built-in)' : ''}</option>)}</select></label>
        {mode === 'new' ? <>{field(create)}<button type="button" className="ac-btn" onClick={create}>✓ Create</button><button type="button" className="ac-btn" onClick={() => setMode(null)}>Cancel</button></>
          : mode === 'rename' ? <>{field(rename)}<button type="button" className="ac-btn" onClick={rename}>✓ Save</button><button type="button" className="ac-btn" onClick={() => setMode(null)}>Cancel</button></>
            : mode === 'delete' ? <><span style={{ color: 'var(--ac-danger-800)' }}>Delete “{cur.label}”?</span><button type="button" className="ac-btn" onClick={() => { deleteStructure(cur.id); setMode(null); onChange(STANDARD_STRUCTURE); }}>✓ Confirm</button>
              <button type="button" className="ac-btn" onClick={() => setMode(null)}>Cancel</button></>
              : <>
                <button type="button" className="ac-btn" title="Create a new structure that starts as a copy of this one" onClick={() => open('new')}>⎘ Duplicate structure</button>
                <button type="button" className="ac-btn" disabled={cur.id === STANDARD_STRUCTURE} title={cur.id === STANDARD_STRUCTURE ? 'The standard structure keeps its name' : undefined} onClick={() => open('rename')}>✎ Rename structure</button>
                <button type="button" className="ac-btn" disabled={!!blocked} title={blocked || undefined} onClick={() => open('delete')}>✕ Delete structure</button>
              </>}
      </div>
      <p style={{ margin: '.4rem 0 0' }}>Edits on this tab change the <strong>{cur.label}</strong> structure only. Used by: {users.length ? users.map((p) => p.label).join(', ') : 'no persona yet (pick it for a persona in 🧩 Section assignment)'}.</p>
    </div>
  );
}
