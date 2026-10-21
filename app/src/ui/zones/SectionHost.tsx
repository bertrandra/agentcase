import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import { SECTION_COMPONENTS } from '../sections';
import { useUi } from '../uiState';
import { DynamicSection } from './dynamic';
import { Placeholder } from './Placeholder';
import { sectionById } from './registry';

const cache = new Map<string, ComponentType>();
function componentFor(id: string): ComponentType | null {
  const loader = SECTION_COMPONENTS[id];
  if (!loader) return null;
  if (!cache.has(id)) cache.set(id, lazy(loader));
  return cache.get(id) as ComponentType;
}

/** Renders the active section: its migrated component, or the placeholder. */
export function SectionHost() {
  const id = useUi((s) => s.activeSection), def = sectionById(id);
  const Cmp = useMemo(() => componentFor(id), [id]);
  return (
    <main className="ac-work" id="main" style={{ gridArea: 'work' }} tabIndex={-1}>
      {Cmp ? <Suspense fallback={<p className="ac-muted">Loading…</p>}><Cmp /></Suspense> : def ? <Placeholder section={def} /> : <DynamicSection id={id} />}
    </main>
  );
}
