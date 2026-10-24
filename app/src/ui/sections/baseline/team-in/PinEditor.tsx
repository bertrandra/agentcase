import { useState } from 'react';
import { activeArtefacts, phasesForScope, type Ctx } from '@/domain';
import { artTeamSkill, skillMapOf } from '@/domain/baseline/skills';
import { pinsOf, type TeamWeights } from '@/domain/baseline/teamWeights';
import { clearPins, pinPhase, setPin } from '@/controllers/baseline';
import { Badge, Panel } from '@/ui/widgets/cards';

/** Pin a team line to specific artefacts: they leave the auto pool and are attributed to that line alone (one line per artefact). */
export function PinEditor({ c, W, row, onClose }: { c: Ctx; W: TeamWeights; row: number; onClose: () => void }) {
  const [q, setQ] = useState('');
  const r = c.s.teamIn[row];
  if (!r) return null;
  const map = skillMapOf(c.s), act = activeArtefacts(c.a, c.s), query = q.toLowerCase();
  const match = (a: (typeof act)[number]) => !query || `${a.id} ${a.name} ${a.norm ?? ''} ${a.skill ?? ''}`.toLowerCase().includes(query);
  const live = pinsOf(r).filter((id) => act.some((a) => a.id === id)).length, dead = pinsOf(r).length - live;
  const pct = W.totW ? ((W.rowW[row] ?? 0) / W.totW) * 100 : 0;
  const blocks = phasesForScope().map((p) => ({ p, arts: act.filter((a) => a.phase === p.id && match(a)) })).filter((b) => b.arts.length);
  return (
    <Panel title={`📌 Pin line ${row + 1} — ${r.skill} (${r.grade}, ${r.loc})`}
      aside={<span className="ac-muted">{live} artefact{live === 1 ? '' : 's'} pinned · Σw {(W.rowW[row] ?? 0).toFixed(1)} = {pct.toFixed(1)}% of scope →
        implied {(W.impliedETP[row] ?? 0).toFixed(2)} FTE
        {dead > 0 && ` · ${dead} pinned artefact${dead === 1 ? '' : 's'} currently out of scope (kept, inert)`}</span>}>
      <div className="ac-form-row">
        <button type="button" onClick={() => clearPins(row)}>Clear pins</button><button type="button" onClick={onClose}>Close</button>
        <input type="text" placeholder="Filter artefacts…" aria-label="Filter artefacts" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ maxHeight: 340, overflow: 'auto' }}>
        {blocks.length === 0 && <em className="ac-muted">No artefact matches.</em>}
        {blocks.map(({ p, arts }) => {
          const allMine = arts.every((a) => W.pin[a.id] === row);
          return (
            <div key={p.id}>
              <div className="ac-form-row" style={{ margin: '4px 0' }}><strong>{p.id} — {p.name}</strong><small>{arts.length}</small>
                <button type="button" onClick={() => pinPhase(row, p.id, !allMine)}>{allMine ? 'unpin all' : 'pin all'}</button></div>
              {arts.map((a) => {
                const owner = W.pin[a.id];
                return (
                  <label key={a.id} className="ac-art">
                    <input type="checkbox" checked={owner === row} aria-label={`Pin ${a.id}`} onChange={(e) => setPin(row, a.id, e.target.checked)} />
                    <Badge tone={a.isReg ? 'amber' : 'blue'}>{a.isReg ? 'REG' : 'STD'}</Badge><code>{a.id}</code>
                    <span className="ac-grow">{a.name}{a.isReg && <small> · {a.norm}</small>}</span>
                    <small>w{(+a.w || 0).toFixed(1)} · {artTeamSkill(a, map)}</small>
                    {owner != null && owner !== row && <small style={{ color: 'var(--ac-brick)' }}>pinned on
                      line {owner + 1} ({c.s.teamIn[owner]?.skill})</small>}
                  </label>
                );
              })}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
