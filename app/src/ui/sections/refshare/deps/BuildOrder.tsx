import { useMemo, useState } from 'react';
import { buildOrder } from '@/domain/refshare/depTree';
import notes from '@/content/refshare/deps-notes.json';
import { Callout } from '@/ui/widgets/cards';
import { ALL_GROUPS, ALL_SECTIONS, type DepsModel } from './useDeps';

/** The build-order proposal: groups in dependency layers, sections ranked by depth, feedback links reported. Read-only. */
export function BuildOrder({ m }: { m: DepsModel }) {
  const [strong, setStrong] = useState(false);
  const t = useMemo(() => buildOrder(m.deps, ALL_SECTIONS, ALL_GROUPS, strong), [m.deps, strong]);
  const label = (id: string) => ALL_GROUPS.find((g) => g.id === id)?.label ?? id;
  const layers = [...new Set(Object.values(t.gLayer))].sort((a, b) => a - b);
  const moves = ALL_SECTIONS.filter((s) => t.newSeq[s.id] !== undefined && t.newSeq[s.id] !== s.groupSeq).length;
  const gMoves = ALL_GROUPS.filter((g) => t.newGroupOrder[g.id] !== undefined && t.newGroupOrder[g.id] !== g.order).length;
  const fb = [...new Set(t.gBroken.map((e) => e.join('>')))];
  return (
    <div>
      <h3>Build order <span className="ac-muted">— {gMoves} group(s) and {moves} section(s) would move to read in dependency order</span></h3>
      <label className="ac-check"><input type="checkbox" checked={strong} onChange={(e) => setStrong(e.target.checked)} /> strong edges only (calculation inputs)</label>
      <Callout>{notes.buildOrderNote}</Callout>
      {layers.map((L) => (
        <div key={L} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <strong style={{ minWidth: 78, color: 'var(--ac-blue)' }}>Layer {L}</strong>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flex: 1 }}>
            {t.gOrder.filter((g) => t.gLayer[g] === L).map((g) => {
              const secs = ALL_SECTIONS.filter((s) => s.group === g).sort((a, b) => (t.newSeq[a.id] ?? 0) - (t.newSeq[b.id] ?? 0));
              const cur = ALL_GROUPS.find((x) => x.id === g)?.order, next = t.newGroupOrder[g];
              return (
                <div key={g} className="ac-chip" style={{ minWidth: 210, maxWidth: 250 }}>
                  <strong>{label(g)}</strong>
                  <div className="ac-muted">order {cur}{next !== cur && <> → <b>{next}</b></>} · {secs.length} sections</div>
                  {secs.map((s) => <div key={s.id} style={{ fontSize: 11, color: t.newSeq[s.id] !== s.groupSeq ? '#BE4D00' : '#555' }}><span className="ac-muted">d{t.depth[s.id] ?? 0}</span> {s.label}{t.newSeq[s.id] !== s.groupSeq && ' ↕'}</div>)}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {fb.length > 0 && (
        <Callout kind="warn">🔁 <strong>{fb.length} feedback link{fb.length === 1 ? '' : 's'} had to be set aside to lay the groups out in a line.</strong> These are real dependencies pointing backwards, not errors.
          <div>{fb.map((k) => { const [a, b] = k.split('>') as [string, string]; return <span key={k} className="ac-badge" style={{ margin: 3 }}>{label(a)} → {label(b)} ({t.gWeight[k] ?? 1})</span>; })}</div>
        </Callout>
      )}
    </div>
  );
}
