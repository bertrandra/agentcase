import { useState } from 'react';
import { setPersonaSectionOrder } from '@/controllers/navLayout';
import { addPersonaSection, removePersonaSection } from '@/controllers/pdcPersonas';
import { bySeq, groupsByOrder } from '@/domain/nav/layout';
import { previewMenu, type Pending } from '@/domain/nav/preview';
import { placeForPersona, shiftForPersona } from '@/domain/nav/moves';
import { personasByOrder, type Persona } from '@/domain/pdc/personas';
import { useNavModel } from '@/ui/zones/navModel';
import { Board } from './Board';
import { LivePreview } from './LivePreview';

/** The per-persona board: every group's sections, the persona's ones highlighted. Double-click assigns / removes; drag or arrows reorder for this persona only. */
export function PersonaLayout({ personas, lists }: { personas: Persona[]; lists: Record<string, string[]> }) {
  const { sections, groups, colors, order } = useNavModel(), editable = personasByOrder(personas).filter((p) => !p.protected), [sel, setSel] = useState(''), [pending, setPending] = useState<Pending | null>(null);
  const pid = editable.some((p) => p.id === sel) ? sel : editable[0]?.id ?? '', assigned = lists[pid] ?? [], on = (id: string) => assigned.includes(id);
  const label = (id: string) => sections.find((s) => s.id === id)?.label ?? id;
  const cols = groupsByOrder(groups).map((group) => ({ group, cards: sections.filter((s) => s.group === group.id).sort(bySeq(pid, order)) }));
  const valid = pending && on(pending.id) && sections.find((s) => s.id === pending.id)?.group === pending.group ? pending : null;
  const preview = previewMenu(pid, sections, groups, lists, order, valid, 'persona');
  if (!pid) return <p className="ac-muted">No assignable persona.</p>;
  return (
    <>
      <label className="ac-field"><span className="ac-field-l">Persona</span>
        <select value={pid} onChange={(e) => setSel(e.target.value)}>{editable.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <p className="ac-muted">{assigned.length} section(s) assigned. Double-click a card to assign or remove it; drag (or ↑ ↓) to order it inside its group for this persona only.</p>
      <Board label="Persona layout" cols={cols} colors={colors} canDrag={(s) => on(s.id)} onPending={setPending}
        cardClass={(s) => (on(s.id) ? '' : 'is-off')} cardExtra={(s) => on(s.id) && <small style={{ color: '#006e79' }}>✓ assigned</small>}
        onDouble={(id) => (on(id) ? removePersonaSection(pid, id) : addPersonaSection(pid, id))}
        onDrop={(id, group, index) => { if (on(id) && sections.find((s) => s.id === id)?.group === group) setPersonaSectionOrder(`Reorder ${label(id)} for ${pid}`, pid, placeForPersona(sections, pid, order, id, index)); }}
        onShift={(id, dir) => setPersonaSectionOrder(`Move ${label(id)} ${dir < 0 ? 'up' : 'down'} for ${pid}`, pid, shiftForPersona(sections, pid, order, id, dir))} />
      <LivePreview persona={editable.find((p) => p.id === pid)} preview={preview} colors={colors} pending={!!valid} />
    </>
  );
}
