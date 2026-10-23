import { useState } from 'react';
import type { MenuPreview } from '@/domain/nav/preview';
import type { Persona } from '@/domain/pdc/personas';
import { groupColor } from '@/ui/zones/navModel';

/** Which persona the Menu layout preview shows: the user's pick while it still exists, else the current persona. */
export function usePreviewPersona(personas: Persona[], current: string): [string, (id: string) => void] {
  const [sel, setSel] = useState('');
  return [personas.some((p) => p.id === sel) ? sel : current, setSel];
}

/** `mark`: a section to point out (the Sections tab's selected row) without any move pending. */
interface Props { persona: Persona | undefined; preview: MenuPreview; colors: Record<string, string>; pending: boolean; mark?: string }

/**
 * Live preview of the persona's sidebar, from the board's current (and, while a card is dragged, would-be) state.
 * Read only and non-interactive: plain headings and list items, no buttons or links, no write path imported.
 */
export function LivePreview({ persona, preview, colors, pending, mark }: Props) {
  const name = persona?.label ?? 'persona', count = preview.nav.reduce((n, g) => n + g.sections.length, 0);
  return (
    <section className="ac-npreview" aria-label={`Live preview of the ${name} menu`}>
      <h3>Live preview <small className="ac-muted">{pending ? '(drop to apply)' : '(read only)'}</small></h3>
      <p className="ac-muted" role="status">{count} section(s) in {preview.nav.length} group(s){pending ? ' if dropped here' : ''}.</p>
      {preview.nav.length === 0 && <p className="ac-muted">This persona has an empty menu.</p>}
      {preview.nav.map(({ group, sections }) => (
        <div key={group.id} data-pgroup={group.id}>
          <h4 style={{ boxShadow: `var(--ac-shadow-rail-offset) ${groupColor(colors, group.id)}`, paddingLeft: 10 }}>{group.label}</h4>
          <ul>{sections.map((s) => <li key={s.id} data-psection={s.id} className={s.id === preview.moved || s.id === mark ? 'is-moving' : ''}>{s.label}{s.id === preview.moved ? ' (moving)' : s.id === mark ? ' (selected)' : ''}</li>)}</ul>
        </div>
      ))}
    </section>
  );
}
