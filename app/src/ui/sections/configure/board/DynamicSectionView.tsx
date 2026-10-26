import { useMemo } from 'react';
import type { DynSection } from '@/domain/pdc/board';
import { useCtx, useDoc } from '@/store/hooks';
import { CardView } from './CardView';
import { renderDynamicSection } from './dynamic';
import { useVarRuntime } from './runtime';

export { renderDynamicSection, type DynamicSectionModel } from './dynamic';

const NO_COLORS: Record<string, string> = {};

/**
 * The tab of a stored dynamic section (legacy renderDynamicSectionBody): title, description, its cards and its body rows, all live.
 * Mount it for a section id of `doc.dynamicSections`; `preview` makes the cards inert (used inside the Board's own panel).
 * It is results-only: cards and rows are edited from the Board's Configure panel.
 */
export function DynamicSectionView({ section, preview }: { section: DynSection; preview?: boolean }) {
  const c = useCtx(), rt = useVarRuntime(), colors = useDoc((d) => (d.GROUP_COLORS as Record<string, string> | undefined) ?? NO_COLORS);
  const m = useMemo(() => renderDynamicSection(section, c, rt), [section, c, rt]);
  return (
    <section aria-label={preview ? `Preview of ${m.title}` : m.title}>
      <h2>🗂️ {m.title}</h2>
      <div className="ac-callout">{m.description || 'No description yet — add one from the 📊 Board tab’s ⚙️ Configure panel.'}</div>
      <div className="ac-form-row">
        {m.cards.length === 0 && <span className="ac-muted">No cards yet — add one from the Board tab.</span>}
        {m.cards.map((card) => <CardView key={card.id} card={card} colors={colors} preview={preview} />)}
      </div>
      <div className="ac-card" role="list" aria-label="Body rows">
        {m.rows.map((r) => <div key={r.id} role="listitem" className="ac-stat"><div className="ac-stat-l">{r.label}</div>
          <div className="ac-stat-v">{r.display}</div></div>)}
      </div>
    </section>
  );
}

/** The same, looked up by section id in the document (what a navigation entry for a dynamic section mounts). */
export function DynamicSectionPage({ id }: { id: string }) {
  const section = useDoc((d) => ((d.dynamicSections as DynSection[] | undefined) ?? []).find((s) => s.id === id));
  return section ? <DynamicSectionView section={section} /> : <p className="ac-muted">This dashboard no longer exists.</p>;
}

export default DynamicSectionPage;
