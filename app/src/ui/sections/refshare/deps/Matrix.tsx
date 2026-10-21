import { useState } from 'react';
import notes from '@/content/refshare/deps-notes.json';
import { goSection } from '@/ui/uiState';
import { ALL_SECTIONS, type DepsModel } from './useDeps';

const strip = (s: string) => s.replace(/^[^A-Za-z0-9]+/, '').trim().slice(0, 18);

/** Row → column impact matrix in build order; ● strong, ○ soft. Participating sections only unless "show all" is ticked. */
export function Matrix({ m }: { m: DepsModel }) {
  const [all, setAll] = useState(false);
  const rows = m.ordered.filter((s) => all || m.part.has(s.id));
  return (
    <div>
      <h3>Dependency matrix <span className="ac-muted">— {all ? `all ${ALL_SECTIONS.length} sections; mostly empty by construction` : `${rows.length} participating sections`}</span></h3>
      <label className="ac-check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> show all {ALL_SECTIONS.length} sections</label>
      <div className="ac-table-wrap">
        <table className="ac-matrix ac-table">
          <thead><tr><th>Row → Col</th>{rows.map((s) => <th key={s.id} title={s.label} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 130, fontSize: 9 }}>{strip(s.label)}</th>)}</tr></thead>
          <tbody>
            {rows.map((src) => {
              const edges = m.deps[src.id] ?? {};
              return (
                <tr key={src.id}>
                  <td>
                    <button type="button" className="ac-golink" onClick={() => goSection(src.id)}>{src.label}</button>
                    {src.tag && <span className="ac-muted"> {src.tag}</span>} <span className="ac-muted">({Object.keys(edges).length}→ · {m.incoming(src.id)}←)</span>
                  </td>
                  {rows.map((tgt) => {
                    const lv = edges[tgt.id];
                    if (src.id === tgt.id) return <td key={tgt.id} style={{ background: '#eceff5' }} />;
                    return <td key={tgt.id} title={lv ? `${src.label} → ${tgt.label} (${lv === 'S' ? 'strong' : 'soft'})` : undefined} style={{ color: lv === 'S' ? '#0058AB' : '#BE4D00' }}>{lv ? (lv === 'S' ? '●' : '○') : ''}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="ac-muted">{notes.provenance}</p>
    </div>
  );
}
