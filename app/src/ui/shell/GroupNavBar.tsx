import { groupBar, firstOfGroup } from '@/domain/nav/groupBar';
import { goSection, toggleMenuHidden, useUi } from '../uiState';
import { useNavModel } from '../zones/navModel';
import { switchPersona } from './personaSwitch';

/**
 * Hide-menu mode (legacy renderGroupNavBar): with the sidebar collapsed, this bar above the section offers ☰ Menu, the persona, Welcome, the
 * groups the persona can reach and the open group's sections — as buttons or as tabs (SECTION_NAV_STYLE). Hidden during a guided walk.
 */
export function GroupNavBar() {
  const m = useNavModel(), active = useUi((s) => s.activeSection), hidden = useUi((s) => s.menuHidden), walking = useUi((s) => s.wiz.active);
  const bar = groupBar(m.persona, active, m.visible, m.groups, m.lists, m.order, m.sections);
  if (!hidden || walking || !bar) return null;
  const pickGroup = (id: string) => { const target = firstOfGroup(m.persona, id, m.visible, m.lists); if (target) goSection(target); };
  return (
    <div className="ac-gnav" role="navigation" aria-label="Group navigation">
      <button type="button" className="ac-btn" onClick={toggleMenuHidden} title="Show the full sidebar menu">☰ Menu</button>
      <select aria-label="Switch persona" value={m.persona} onChange={(e) => switchPersona(e.target.value, m.landing(e.target.value))}>
        {m.personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <div className="ac-gnav-break" />
      <button type="button" className={`ac-btn${active === 'home' ? ' is-active' : ''}`} aria-label="Welcome" title="Welcome" onClick={() => goSection('home')}>🏠</button>
      <select aria-label="Group" value={bar.selected} onChange={(e) => pickGroup(e.target.value)}>
        {bar.groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
      </select>
      <div className="ac-gnav-break" />
      <div role={m.style === 'tabs' ? 'tablist' : 'group'} aria-label="Sections of the group" className={m.style === 'tabs' ? 'ac-gnav-tabs' : 'ac-gnav-items'}>
        {bar.sections.map((s) => (
          <button key={s.id} type="button" role={m.style === 'tabs' ? 'tab' : undefined} aria-selected={m.style === 'tabs' ? s.id === active : undefined}
            className={`ac-btn${s.id === active ? ' is-active' : ''}`} onClick={() => goSection(s.id)}>{s.label}</button>
        ))}
      </div>
    </div>
  );
}
