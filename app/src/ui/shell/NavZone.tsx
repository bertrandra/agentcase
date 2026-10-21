import { useEffect, useRef } from 'react';
import { goSection, openGroup, toggleGroup, useUi } from '../uiState';
import { groupColor, useNavModel } from '../zones/navModel';

/**
 * The sidebar, generated from the document: its groups (label, colour, order), the persona's sections in the persona's order, dynamic sections included.
 * Groups are accordion buttons (legacy toggleGroup): one open at a time, all closed at start, the group of the active section opens when it changes.
 */
export function NavZone() {
  const { nav, colors } = useNavModel(), active = useUi((s) => s.activeSection), open = useUi((s) => s.openGroup);
  const home = nav.find((g) => g.sections.some((s) => s.id === active))?.group.id;
  const seen = useRef('home');   // landing on Welcome keeps every group closed; any other section (also when the menu is shown later) opens its group
  useEffect(() => { if (seen.current !== active) { seen.current = active; if (home) openGroup(home); } }, [active, home]);
  return (
    <nav className="ac-nav" aria-label="Sections" style={{ gridArea: 'nav' }}>
      {nav.map(({ group, sections }) => {
        const expanded = open === group.id;
        return (
          <section key={group.id} aria-labelledby={`g-${group.id}`} data-group={group.id}>
            <h2 id={`g-${group.id}`} className="ac-nav-group" title={group.description} style={{ boxShadow: `inset 4px 0 0 ${groupColor(colors, group.id)}`, paddingLeft: 10 }}>
              <button type="button" id={`gb-${group.id}`} className="ac-nav-toggle" aria-expanded={expanded} aria-controls={`gl-${group.id}`} onClick={() => toggleGroup(group.id)}>
                <span>{group.label}</span><span className="ac-chev" aria-hidden="true">▼</span>
              </button>
            </h2>
            <ul id={`gl-${group.id}`} hidden={!expanded}>
              {sections.map((s) => (
                <li key={s.id}>
                  <button type="button" className={s.id === active ? 'is-active' : ''} aria-current={s.id === active ? 'page' : undefined} title={s.description} data-section={s.id} onClick={() => goSection(s.id)}>
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
