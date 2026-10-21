import { useState } from 'react';
import { clearPersonaSectionOrder, setPersonaSectionOrder } from '@/controllers/navLayout';
import { addPersonaSection, removePersonaSection } from '@/controllers/pdcPersonas';
import { appOrder, type NavSection } from '@/domain/nav/layout';
import { respaceOrders } from '@/domain/nav/sequence';
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';

/** The menu of one persona: sections it can reach in the persona's own order (editable, sparse override), and the ones that can still be added. */
export function Assignment({ personas, lists }: { personas: Persona[]; lists: Record<string, string[]> }) {
  const { sections: SECTIONS, groups, order } = useNavModel(), [pid, setPid] = useState(''), [add, setAdd] = useState('');
  const p = personas.find((x) => x.id === pid), assigned = p && !p.protected ? lists[p.id] ?? [] : [], available = SECTIONS.filter((s) => !assigned.includes(s.id));
  const known = assigned.map((id) => SECTIONS.find((s) => s.id === id)).filter((s): s is NavSection => !!s);
  const shown = p ? appOrder(p.id, known, groups, order) : [], mine = (id: string) => (p ? order[p.id]?.[id] : undefined);
  return (
    <>
      <label className="ac-field"><span className="ac-field-l">Persona</span>
        <select value={pid} onChange={(e) => setPid(e.target.value)}><option value="">— Pick a persona —</option>{personasByOrder(personas).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
      {!p && <p className="ac-muted"><em>Pick a persona above to manage its sections.</em></p>}
      {p?.protected && <p className="ac-muted">{p.label} is protected: it sees every section ({SECTIONS.length}).</p>}
      {p && !p.protected && (
        <div className="ac-form-row">
          <div style={{ flex: '1 1 380px' }}>
            <p className="ac-muted">Assigned sections, in the order of {p.label} (blank order = the global order).{' '}
              <button type="button" className="ac-btn" disabled={!shown.length} onClick={() => setPersonaSectionOrder(`Respace the menu of ${p.id}`, p.id, respaceOrders(p.id, shown, groups, order))}>↔ Respace ×10</button></p>
            <ul aria-label={`Sections of ${p.label}`}>
              {shown.map((s) => (
                <li key={s.id}>{s.label} <small className="ac-muted">{s.group}</small>{' '}
                  <input type="number" aria-label={`Order of ${s.id} for ${p.id}`} placeholder={String(s.groupSeq || 0)} style={{ width: 60, textAlign: 'center' }} value={mine(s.id) ?? ''}
                    onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setPersonaSectionOrder(`Set the order of ${s.id} for ${p.id} to ${n}`, p.id, { [s.id]: n }); }} />
                  {mine(s.id) != null && <button type="button" className="ac-btn" aria-label={`Inherit the order of ${s.id}`} onClick={() => clearPersonaSectionOrder(p.id, s.id)}>↺</button>}
                  <button type="button" className="ac-btn" aria-label={`Remove ${s.label}`} onClick={() => removePersonaSection(p.id, s.id)}>✕</button></li>
              ))}
              {assigned.filter((id) => !known.some((s) => s.id === id)).map((id) => <li key={id}>{id} <button type="button" className="ac-btn" aria-label={`Remove ${id}`} onClick={() => removePersonaSection(p.id, id)}>✕</button></li>)}
              {assigned.length === 0 && <li className="ac-muted">No section yet.</li>}
            </ul>
          </div>
          <div>
            <select aria-label="Available sections" size={8} value={add} onChange={(e) => setAdd(e.target.value)}>{available.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
            <div><button type="button" className="ac-btn" disabled={!add} onClick={() => { addPersonaSection(p.id, add); setAdd(''); }}>➕ Add to {p.label}</button></div>
          </div>
        </div>
      )}
    </>
  );
}
