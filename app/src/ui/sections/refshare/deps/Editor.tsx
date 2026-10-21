import { useState } from 'react';
import { addDepEdge, flipDepEdge, removeDepEdge, setDepDescription } from '@/controllers/refshare';
import { tagMismatch } from '@/domain/refshare/deps';
import { ALL_GROUPS, ALL_SECTIONS, labelOf, type DepsModel } from './useDeps';

type Filter = 'sources' | 'drives' | 'all';

function Card({ id, m }: { id: string; m: DepsModel }) {
  const sec = ALL_SECTIONS.find((s) => s.id === id)!, edges = m.deps[id] ?? {}, keys = Object.keys(edges), bad = tagMismatch(m.deps, sec);
  return (
    <div className="ac-chip" style={{ display: 'block', margin: '7px 0', padding: 9, background: bad ? '#FFFAF3' : undefined }}>
      <div><strong>{sec.label}</strong> <span className="ac-badge">{sec.tag ?? '—'}</span> <span className="ac-muted">{keys.length} out · {m.incoming(id)} in</span> {bad && <span style={{ color: '#BE4D00' }}>⚠ {bad}</span>}</div>
      <div style={{ margin: '5px 0' }}>
        {keys.length === 0 && <span className="ac-muted">no outgoing edges</span>}
        {keys.map((t) => (
          <span key={t} className="ac-badge" data-tone={edges[t] === 'S' ? 'blue' : 'amber'} style={{ margin: 2 }}>
            <button type="button" className="ac-golink" title="Click to flip strong ↔ soft" aria-label={`Flip ${sec.label} to ${labelOf(t)}`} onClick={() => flipDepEdge(id, t)}>{edges[t] === 'S' ? '●' : '○'} {labelOf(t)}</button>
            {' '}<button type="button" className="ac-golink" title="Remove this edge" aria-label={`Remove ${sec.label} to ${labelOf(t)}`} onClick={() => removeDepEdge(id, t)}>✕</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select aria-label={`Add target for ${sec.label}`} value="" onChange={(e) => addDepEdge(id, e.target.value)}>
          <option value="">+ add target…</option>
          {ALL_GROUPS.map((g) => <optgroup key={g.id} label={g.label}>{ALL_SECTIONS.filter((t) => t.group === g.id && t.id !== id && !edges[t.id]).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</optgroup>)}
        </select>
        <input type="text" aria-label={`Nature and impact of ${sec.label}`} style={{ flex: 1, minWidth: 240 }} placeholder="nature & impact (shown in the description table)" value={m.desc[id] ?? ''} onChange={(e) => setDepDescription(id, e.target.value)} />
      </div>
    </div>
  );
}

/** The edge editor: one card per source section — flip, remove, add targets, describe. Every edit is an undoable command. */
export function Editor({ m }: { m: DepsModel }) {
  const [filter, setFilter] = useState<Filter>('sources'), [q, setQ] = useState('');
  const pool = m.ordered.filter((s) => (filter === 'all' || (filter === 'sources' ? Object.keys(m.deps[s.id] ?? {}).length > 0 : (s.tag ?? '').includes('drives'))) && (!q || `${s.label} ${s.id}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <h3>🔗 Dependencies — what each section drives</h3>
      <p className="ac-muted">One row per source section; add a target, then click its chip to flip ● strong (a calculation input) ↔ ○ soft (an annotation or signal), or ✕ to remove it. The other views read this live — they are never edited directly.</p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <strong>{m.edges} edges · {m.sources.length} of {ALL_SECTIONS.length} sections drive something</strong>
        <label>Show <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}><option value="sources">sections with edges</option><option value="drives">drives-tagged only</option><option value="all">all {ALL_SECTIONS.length} sections</option></select></label>
        <input type="search" placeholder="🔍 filter by name…" aria-label="Filter sections by name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {pool.length === 0 ? <p className="ac-muted">No sections match this filter.</p> : pool.map((s) => <Card key={s.id} id={s.id} m={m} />)}
    </div>
  );
}
