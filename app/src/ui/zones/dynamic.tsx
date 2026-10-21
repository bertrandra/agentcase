import type { DynSection } from '@/domain/pdc/board';
import { useDoc } from '@/store/hooks';
import { SectionFrame } from './SectionFrame';

/** Minimal view of a stored dynamic section (title, cards with their bound variables, rows). Replaced by the Board's DynamicSectionView once it lands. */
function Basic({ section }: { section: DynSection }) {
  return (
    <SectionFrame title={section.title}
      input={<p className="ac-muted">{section.description}</p>}
      result={
        <>
          <ul aria-label="Cards">
            {section.cards.filter((c) => c.CARD_ENABLED).map((c) => (
              <li key={c.CARD_ID}><strong>{c.CARD_NAME_VALUE}</strong> <span className="ac-muted">{[c.CARD_IMPACT_VAR, c.CARD_KEY1_VAR, c.CARD_KEY2_VAR].filter(Boolean).join(' · ')}</span></li>
            ))}
          </ul>
          {section.rows.length > 0 && <p className="ac-muted">{section.rows.length} row(s)</p>}
        </>
      } />
  );
}

/**
 * Adapter between the section host and the rendering of a stored dynamic section (a record of the document's `dynamicSections`).
 * INTEGRATOR: to mount the Board's real view, import `DynamicSectionView` here and render it in place of `Basic` — nothing else changes.
 */
export function DynamicSection({ id }: { id: string }) {
  const section = useDoc((d) => (d.dynamicSections as DynSection[] | undefined)?.find((s) => s.id === id));
  return section ? <Basic section={section} /> : <p>Unknown section.</p>;
}
