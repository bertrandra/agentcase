import { useState } from 'react';
import { placeSections, setGroupOrders } from '@/controllers/navLayout';
import { groupsByOrder } from '@/domain/nav/layout';
import { previewMenu, type Pending } from '@/domain/nav/preview';
import { placeSection, shiftGroup, shiftSection, shiftToGroup } from '@/domain/nav/moves';
import { useNavModel } from '@/ui/zones/navModel';
import { Board } from './Board';
import { LivePreview, usePreviewPersona } from './LivePreview';

/** The graphical menu layout (legacy "Menu layout" board): sections per group column; drag a card or use the arrows to change its group and order for every persona. */
export function MenuLayout() {
  const { sections, groups, colors, personas, persona, lists, order } = useNavModel(), [mvp, setMvp] = useState(false), [pending, setPending] = useState<Pending | null>(null);
  const [who, setWho] = usePreviewPersona(personas, persona), preview = previewMenu(who, sections, groups, lists, order, pending, 'global');
  const label = (id: string) => sections.find((s) => s.id === id)?.label ?? id, groupLabel = (id: string) => groups.find((g) => g.id === id)?.label ?? id;
  const cols = groupsByOrder(groups).map((group) => ({ group, cards: sections.filter((s) => s.group === group.id && (!mvp || s.mvp)).sort((a, b) => (a.groupSeq || 0) - (b.groupSeq || 0)) }));
  return (
    <>
      <label className="ac-field"><span><input type="checkbox" checked={mvp} onChange={(e) => setMvp(e.target.checked)} /> Show MVP only</span></label>
      <p className="ac-muted">Drag cards across groups, or use the arrows: ↑ ↓ reorder inside the group, ← → move to the previous / next group; ◀ ▶ move a group. Applies to every persona.</p>
      <Board label="Menu layout" cols={cols} colors={colors}
        onPending={setPending} cardClass={(s) => (s.mvp ? 'is-mvp' : '')}
        cardExtra={(s) => (s.mvp || s.tag) && <small style={{ color: '#b04600' }}>{s.mvp ? 'MVP ' : ''}{s.tag ?? ''}</small>}
        onDrop={(id, group, index) => placeSections(`Move ${label(id)} to ${groupLabel(group)}`, placeSection(sections, id, group, index))}
        onShift={(id, dir) => placeSections(`Move ${label(id)} ${dir < 0 ? 'up' : 'down'}`, shiftSection(sections, id, dir))}
        onShiftGroup={(id, dir) => placeSections(`Move ${label(id)} to the ${dir < 0 ? 'previous' : 'next'} group`, shiftToGroup(sections, groups, id, dir))}
        onShiftColumn={(id, dir) => setGroupOrders(`Move the group ${groupLabel(id)} ${dir < 0 ? 'earlier' : 'later'} in the menu`, shiftGroup(groups, id, dir))} />
      <label className="ac-field"><span className="ac-field-l">Preview as</span>
        <select value={who} onChange={(e) => setWho(e.target.value)}>{personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
      <LivePreview persona={personas.find((p) => p.id === who)} preview={preview} colors={colors} pending={!!pending} />
    </>
  );
}
