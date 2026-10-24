import { Suspense, lazy, useMemo, type ComponentType } from 'react';
import { SECTION_COMPONENTS } from '../sections';
import { useUi } from '../uiState';
import { DynamicSection } from './dynamic';
import { InPlaceEdit } from './InPlaceEdit';
import { Placeholder } from './Placeholder';
import { sectionById } from './registry';
import { sectionKind } from './sectionScope';
import { useScopedSection } from './useScopedSection';

const cache = new Map<string, ComponentType>();
function componentFor(id: string): ComponentType | null {
  const loader = SECTION_COMPONENTS[id];
  if (!loader) return null;
  if (!cache.has(id)) cache.set(id, lazy(loader));
  return cache.get(id) as ComponentType;
}

const loading = <p className="ac-muted">Loading…</p>;

/**
 * Renders the active section: its migrated component, or the placeholder. With 2+ products and a Wave / Portfolio in view, a section that follows
 * the View (docs/VUE_AGREGEE.md) is replaced by its aggregate or the generic fallback of its kind — an input section keeps its summary on top and is
 * editable in place below it, for the product or the common values the top-bar "Change" names; in every other case the output is the section alone.
 */
export function SectionHost() {
  const id = useUi((s) => s.activeSection), def = sectionById(id);
  const Cmp = useMemo(() => componentFor(id), [id]), scoped = useScopedSection(id), inPlace = scoped.mode !== 'section' && sectionKind(id) === 'I-input';
  return (
    <main className="ac-work" id="main" style={{ gridArea: 'work' }} tabIndex={-1}>
      {scoped.mode === 'aggregate' ? <Suspense fallback={loading}><scoped.Cmp /></Suspense>
        : scoped.mode === 'fallback' ? <Suspense fallback={loading}><scoped.Fallback id={id} title={def?.label ?? id} Section={Cmp} /></Suspense>
        : Cmp ? <Suspense fallback={<p className="ac-muted">Loading…</p>}><Cmp /></Suspense> : def ? <Placeholder section={def} /> : <DynamicSection id={id} />}
      {inPlace && Cmp && <InPlaceEdit id={id} Section={Cmp} />}
    </main>
  );
}
