import { useState } from 'react';
import { addPersonaSection, removePersonaSection } from '@/controllers/pdcPersonas';
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { SECTIONS } from '@/ui/zones/registry';

const label = (id: string) => SECTIONS.find((s) => s.id === id)?.label ?? id;

/** The menu of one persona: sections it can reach (Advanced sees everything) and the ones that can still be added. */
export function Assignment({ personas, lists }: { personas: Persona[]; lists: Record<string, string[]> }) {
  const [pid, setPid] = useState(''), [add, setAdd] = useState('');
  const p = personas.find((x) => x.id === pid), assigned = p && !p.protected ? lists[p.id] ?? [] : [], available = SECTIONS.filter((s) => !assigned.includes(s.id));
  return (
    <>
      <label className="ac-field"><span className="ac-field-l">Persona</span>
        <select value={pid} onChange={(e) => setPid(e.target.value)}><option value="">— Pick a persona —</option>{personasByOrder(personas).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      {!p && <p className="ac-muted"><em>Pick a persona above to manage its sections.</em></p>}
      {p?.protected && <p className="ac-muted">{p.label} is protected: it sees every section ({SECTIONS.length}).</p>}
      {p && !p.protected && (
        <div className="ac-form-row">
          <ul aria-label={`Sections of ${p.label}`} style={{ flex: '1 1 380px' }}>
            {assigned.map((id) => <li key={id}>{label(id)} <button type="button" className="ac-btn" aria-label={`Remove ${label(id)}`} onClick={() => removePersonaSection(p.id, id)}>✕</button></li>)}
            {assigned.length === 0 && <li className="ac-muted">No section yet.</li>}
          </ul>
          <div>
            <select aria-label="Available sections" size={8} value={add} onChange={(e) => setAdd(e.target.value)}>{available.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            <div><button type="button" className="ac-btn" disabled={!add} onClick={() => { addPersonaSection(p.id, add); setAdd(''); }}>➕ Add to {p.label}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
