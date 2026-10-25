import { setDescription } from '@/controllers/pdcBoardRows';
import type { DynSection } from '@/domain/pdc/board';
import { CardsEditor } from './CardsEditor';
import { RowsEditor } from './RowsEditor';

/** Everything editable about a dashboard: its description, its cards and its body rows (the section’s own tab only displays the results). */
export function Configure({ section }: { section: DynSection }) {
  return (
    <section aria-label={`Configure ${section.title}`}>
      <h3>⚙️ Configure — {section.title}</h3>
      <h4>Description</h4>
      <textarea rows={2} className="ac-wide" aria-label={`Description of ${section.title}`} placeholder="Shown under the section title on its own tab" value={section.description ?? ''} onChange={(e) => setDescription(section.id, e.target.value)} />
      <CardsEditor section={section} />
      <RowsEditor section={section} />
    </section>
  );
}
