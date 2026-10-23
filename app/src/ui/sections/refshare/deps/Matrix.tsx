import { useMemo, useState } from 'react';
import notes from '@/content/refshare/deps-notes.json';
import { goSection } from '@/ui/uiState';
import { cell, DATA, isReference, LAYERS, zoneOf } from './model';
import { tok } from '@/domain/theme';

const strip = (s: string) => s.replace(/^[^A-Za-z0-9]+/, '').trim().slice(0, 22);
const MARK = { direct: ['●', 'var(--ac-primary-700)', 'direct import'], write: ['✎', 'var(--ac-warning-600)', 'writes through a controller'], indirect: ['○', 'var(--ac-slate-675)', 'only through other zones'] } as const;

/** Rows (zones, then sections) depend on columns (zones): ● direct import, ✎ an input section writing through a controller, ○ only through other zones. */
export function Matrix() {
  const [all, setAll] = useState(false);
  const cols = LAYERS.order;
  const sections = useMemo(() => DATA.sections.filter((s) => all || !isReference(s.id)), [all]);
  const body = useMemo(() => [
    ...cols.map((id) => ({ id, label: zoneOf(id)!.label, zone: true })),
    ...sections.map((s) => ({ id: s.id, label: s.label, zone: false })),
  ].map((r) => ({ ...r, cells: cols.map((c) => cell(r.id, c)) })), [cols, sections]);
  const shown = (kind: keyof typeof MARK): number => body.reduce((n, r) => n + r.cells.filter((c) => c === kind).length, 0);
  return (
    <div>
      <h2>Dependency matrix <span className="ac-muted">— {cols.length} zones and {sections.length} sections, in build order</span></h2>
      <p className="ac-muted">Read a marked cell as <b>row depends on column</b>: the column zone feeds the row. <span style={{ color: MARK.direct[1] }}>● direct</span> = the row imports modules of the zone · <span style={{ color: MARK.write[1] }}>✎ write</span> = an input section changes the zone through a controller command · <span style={{ color: MARK.indirect[1] }}>○ indirect</span> = only through other zones. {shown('direct')} direct, {shown('write')} write and {shown('indirect')} indirect marks.</p>
      <label className="ac-check"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> show the {DATA.sections.filter((s) => isReference(s.id)).length} reference sections (no calculation)</label>
      <div className="ac-table-wrap" tabIndex={0} role="region" aria-label="Dependency matrix">
        <table className="ac-matrix ac-table">
          <thead><tr><th>Row ← Column</th>{cols.map((c) => <th key={c} title={zoneOf(c)!.label} style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', maxHeight: 150, fontSize: 'var(--ac-font-size-2xs)' }}>{strip(zoneOf(c)!.label)}</th>)}</tr></thead>
          <tbody>
            {body.map((r) => (
              <tr key={r.id} data-row={r.id}>
                <td>{r.zone ? <strong>{r.label}</strong> : <button type="button" className="ac-golink" onClick={() => goSection(r.id)}>{r.label}</button>}</td>
                {r.cells.map((c, i) => {
                  if (!c) return <td key={cols[i]} style={{ background: r.id === cols[i] ? 'var(--ac-slate-85)' : undefined }} />;
                  const [mark, color, why] = MARK[c];
                  return <td key={cols[i]} data-cell={c} title={`${r.label} ← ${zoneOf(cols[i]!)!.label}: ${why}`} style={{ color }}>{mark}<span className="sr-only">{why}</span></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ac-muted">{notes.provenance}</p>
    </div>
  );
}
