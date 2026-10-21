import { useState } from 'react';
import { removeDashboard, renameDashboard, setDashboardGroup } from '@/controllers/pdcBoard';
import type { DynSection } from '@/domain/pdc/board';
import { useCtx } from '@/store/hooks';
import type { GroupDef } from '@/ui/zones/registry';
import { CardView } from './CardView';
import { Configure } from './Configure';

type Mode = { id: string; kind: 'rename' | 'delete' | 'configure' | 'open' } | null;

/** The generated dashboards: open (live cards), configure (bind variables), rename, move to a menu group, remove. */
export function Registry({ sections, groups, colors }: { sections: DynSection[]; groups: GroupDef[]; colors: Record<string, string> }) {
  const [mode, setMode] = useState<Mode>(null), [name, setName] = useState(''), c = useCtx();
  const is = (s: DynSection, k: NonNullable<Mode>['kind']) => mode?.id === s.id && mode.kind === k;
  const shown = sections.find((s) => mode && s.id === mode.id && (mode.kind === 'open' || mode.kind === 'configure'));
  return (
    <>
      <div className="ac-table-wrap"><table className="ac-table">
        <thead><tr><th>Section</th><th>Group</th><th>Cards</th><th>Rows</th><th /></tr></thead>
        <tbody>
          {sections.length === 0 && <tr><td colSpan={5} className="ac-muted">No dynamic sections yet.</td></tr>}
          {sections.map((s) => (
            <tr key={s.id}>
              <td>{is(s, 'rename')
                ? <input type="text" aria-label="New name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { renameDashboard(s.id, name); setMode(null); } if (e.key === 'Escape') setMode(null); }} />
                : `🗂️ ${s.title}`}</td>
              <td><select aria-label={`Group of ${s.title}`} value={s.menuGroup} onChange={(e) => setDashboardGroup(s.id, e.target.value)}>{groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select></td>
              <td>{s.cards.length}</td><td>{s.rows.length}</td>
              <td>{is(s, 'delete')
                ? <>Delete “{s.title}”? <button type="button" className="ac-btn" onClick={() => { removeDashboard(s.id, s.title); setMode(null); }}>✓ Confirm</button> <button type="button" className="ac-btn" onClick={() => setMode(null)}>Cancel</button></>
                : <>
                  <button type="button" className="ac-btn" onClick={() => setMode(is(s, 'open') ? null : { id: s.id, kind: 'open' })}>Open</button>{' '}
                  <button type="button" className="ac-btn" onClick={() => setMode(is(s, 'configure') ? null : { id: s.id, kind: 'configure' })}>⚙️ Configure</button>{' '}
                  {is(s, 'rename') ? <button type="button" className="ac-btn" onClick={() => { renameDashboard(s.id, name); setMode(null); }}>✓ Save</button>
                    : <button type="button" className="ac-btn" onClick={() => { setName(s.title); setMode({ id: s.id, kind: 'rename' }); }}>✎ Rename</button>}{' '}
                  <button type="button" className="ac-btn" onClick={() => setMode({ id: s.id, kind: 'delete' })}>✕ Remove</button></>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {shown && mode?.kind === 'configure' && <Configure section={shown} />}
      {shown && (
        <section aria-label={`Preview of ${shown.title}`}>
          <h3>🗂️ {shown.title}</h3><p className="ac-muted">{shown.description || 'No description yet — add one from the Board’s Configure panel.'}</p>
          <div className="ac-form-row">{shown.cards.filter((x) => x.CARD_ENABLED !== false).sort((a, b) => a.CARD_SEQ - b.CARD_SEQ).map((card) => <CardView key={card.CARD_ID} c={c} card={card} colors={colors} preview />)}</div>
        </section>
      )}
    </>
  );
}
