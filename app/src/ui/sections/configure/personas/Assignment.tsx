import { useState } from 'react';
import { clearPersonaSectionOrder, setPersonaSectionOrder } from '@/controllers/navLayout';
import { addPersonaSection, removePersonaSection } from '@/controllers/pdcPersonas';
import { appOrder, type NavSection } from '@/domain/nav/layout';
import { respaceOrders } from '@/domain/nav/sequence';
import type { Persona } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';

/** The menu of one persona (legacy pmRenderAssignment): sections it can reach in the persona's own order (editable, sparse override) and grouped by
 *  the persona's menu structure, and the ones that can still be added. */
export function Assignment({ persona: p, lists }: { persona: Persona; lists: Record<string, string[]> }) {
  const { order, view, structureOfPersona } = useNavModel(), { sections: SECTIONS, groups } = view(structureOfPersona(p.id)), [add, setAdd] = useState('');
  const assigned = p.protected ? [] : lists[p.id] ?? [], available = SECTIONS.filter((s) => !assigned.includes(s.id));
  const known = assigned.map((id) => SECTIONS.find((s) => s.id === id)).filter((s): s is NavSection => !!s);
  const shown = appOrder(p.id, known, groups, order), mine = (id: string) => order[p.id]?.[id],
    groupLabel = (id: string) => groups.find((g) => g.id === id)?.label ?? id;
  if (p.protected) return <p className="ac-muted">{p.label} is protected: it sees every section ({SECTIONS.length}).</p>;
  return (
    <div className="ac-form-row">
      <div className="ac-assign-list">
        <p className="ac-muted">Assigned sections, in the order of {p.label} (blank order = the global order).{' '}
          <button
            type="button"
            className="ac-btn"
            disabled={!shown.length}
            onClick={() => setPersonaSectionOrder(`Respace the menu of ${p.id}`, p.id, respaceOrders(p.id, shown, groups, order))}
          >↔ Respace ×10</button></p>
        <ul aria-label={`Sections of ${p.label}`}>
          {shown.map((s) => (
            <li key={s.id}>{s.label} <small className="ac-muted">{groupLabel(s.group)}</small>{' '}
              <input type="number" aria-label={`Order of ${s.id} for ${p.id}`} placeholder={String(s.groupSeq
                || 0)} className="ac-order-input" value={mine(s.id) ?? ''}
                onChange={(e) => { const n = parseFloat(e.target.value); if (!isNaN(n)) setPersonaSectionOrder(`Set the order of ${s.id} for ${p.id} to ${n}`,
                  p.id, { [s.id]: n }); }} />
              {mine(s.id) != null && <button
                type="button"
                className="ac-btn"
                aria-label={`Inherit the order of ${s.id}`}
                onClick={() => clearPersonaSectionOrder(p.id, s.id)}
              >↺</button>}
              <button type="button" className="ac-btn" aria-label={`Remove ${s.label}`} onClick={() => removePersonaSection(p.id, s.id)}>✕</button></li>
          ))}
          {assigned.filter((id) => !known.some((s) => s.id === id)).map((id) =>
            <li key={id}>{id} <button type="button" className="ac-btn" aria-label={`Remove ${id}`} onClick={() => removePersonaSection(p.id,
            id)}>✕</button></li>)}
          {assigned.length === 0 && <li className="ac-muted">No section yet.</li>}
        </ul>
      </div>
      <div>
        <select aria-label="Available sections" size={8} value={add} onChange={(e) => setAdd(e.target.value)}>{available.map((s) => <option
          key={s.id}
          value={s.id}
        >{s.label} ({groupLabel(s.group)})</option>)}</select>
        <div><button
          type="button"
          className="ac-btn"
          disabled={!add}
          onClick={() => { addPersonaSection(p.id, add); setAdd(''); }}
        >➕ Add to {p.label}</button></div>
      </div>
    </div>
  );
}
