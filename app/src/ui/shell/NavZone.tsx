import { goSection, useUi } from '../uiState';
import { groupColor, useNavModel } from '../zones/navModel';

/** The sidebar, generated from the document: its groups (label, colour, order), the persona's sections in the persona's order, dynamic sections included. */
export function NavZone() {
  const { nav, colors } = useNavModel(), active = useUi((s) => s.activeSection);
  return (
    <nav className="ac-nav" aria-label="Sections" style={{ gridArea: 'nav' }}>
      {nav.map(({ group, sections }) => (
        <section key={group.id} aria-labelledby={`g-${group.id}`} data-group={group.id}>
          <h2 id={`g-${group.id}`} className="ac-nav-group" title={group.description} style={{ boxShadow: `inset 4px 0 0 ${groupColor(colors, group.id)}`, paddingLeft: 10 }}>{group.label}</h2>
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <button type="button" className={s.id === active ? 'is-active' : ''} aria-current={s.id === active ? 'page' : undefined} title={s.description} data-section={s.id} onClick={() => goSection(s.id)}>
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
