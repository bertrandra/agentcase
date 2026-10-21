import { useDoc } from '@/store/hooks';
import { goSection, useUi } from '../uiState';
import { groupedNav, visibleSections } from '../zones/registry';

/** Sections grouped by navigation group, filtered by the active persona. */
export function NavZone() {
  const persona = useDoc((d) => (d.currentPersona as string) ?? 'builder'), configured = useDoc((d) => d.PERSONA_SECTIONS as Record<string, string[]> | undefined);
  const active = useUi((s) => s.activeSection);
  const groups = groupedNav(visibleSections(persona, configured));
  return (
    <nav className="ac-nav" aria-label="Sections" style={{ gridArea: 'nav' }}>
      {groups.map(({ group, sections }) => (
        <section key={group.id} aria-labelledby={`g-${group.id}`}>
          <h2 id={`g-${group.id}`} className="ac-nav-group" title={group.description}>{group.label}</h2>
          <ul>
            {sections.map((s) => (
              <li key={s.id}>
                <button type="button" className={s.id === active ? 'is-active' : ''} aria-current={s.id === active ? 'page' : undefined} title={s.description} onClick={() => goSection(s.id)}>
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
