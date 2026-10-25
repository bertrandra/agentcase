import { useMemo, useState } from 'react';
import { phasesForScope } from '@/domain';
import { sharedLineArtefacts, type SharedTeamLine } from '@/domain/portfolio';
import { clearSharedPins, setSharedPins } from '@/controllers/sharedTeam';
import { useCorePortfolio } from '@/store/consolidationHooks';
import { Badge, Panel } from '@/ui/widgets/cards';

/**
 * Pin a shared team line to specific artefacts (as a row of the Input team): in every product holding a share of the line, they leave the auto pool
 * and go to its share row. The list is the union of those products' active artefacts. Every change is one undoable command.
 */
export function SharedPinEditor({ line, index, lines, onClose }: { line: SharedTeamLine; index: number; lines: SharedTeamLine[]; onClose: () => void }) {
  const [q, setQ] = useState(''), pf = useCorePortfolio();
  const arts = useMemo(() => sharedLineArtefacts(pf, line), [pf, line]), query = q.toLowerCase();
  const owner = useMemo(() => {
    const m = new Map<string, number>();
    lines.forEach((l, i) => (l.pins ?? []).forEach((id) => { if (!m.has(id)) m.set(id, i); }));
    return m;
  }, [lines]);
  const mine = line.pins ?? [], live = mine.filter((id) => arts.some((a) => a.id === id)).length, dead = mine.length - live;
  const shown = arts.filter((a) => !query || `${a.id} ${a.name} ${a.norm ?? ''} ${a.skill ?? ''}`.toLowerCase().includes(query));
  const blocks = phasesForScope().map((p) => ({ p, arts: shown.filter((a) => a.phase === p.id) })).filter((b) => b.arts.length);
  const who = `shared line ${index + 1}`;
  return (
    <Panel title={`📌 Pin ${who} — ${line.skill} (${line.grade}, ${line.loc})`}
      aside={<span className="ac-muted" aria-live="polite">{live} artefact{live === 1 ? '' : 's'} pinned
        {dead > 0 && ` · ${dead} pinned artefact${dead === 1 ? '' : 's'} out of the products' scope (kept, inert)`}</span>}>
      <p className="ac-muted">A pinned artefact goes to this line&apos;s share row in every product that has a share of it (a product&apos;s own pinned
        row comes first).</p>
      <div className="ac-form-row">
        <button type="button" onClick={() => clearSharedPins(line.id)}>Clear pins</button><button type="button" onClick={onClose}>Close</button>
        <input type="text" placeholder="Filter artefacts…" aria-label={`Filter artefacts of ${who}`} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="ac-pin-list">
        {blocks.length === 0 && <em className="ac-muted">No artefact matches.</em>}
        {blocks.map(({ p, arts: list }) => {
          const all = list.every((a) => mine.includes(a.id));
          return (
            <div key={p.id}>
              <div className="ac-form-row ac-pin-phase"><strong>{p.id} — {p.name}</strong><small>{list.length}</small>
                <button type="button" aria-label={`${all ? 'Unpin' : 'Pin'} all of phase ${p.id} on ${who}`}
                  onClick={() => setSharedPins(line.id, list.map((a) => a.id), !all)}>{all ? 'unpin all' : 'pin all'}</button></div>
              {list.map((a) => {
                const at = owner.get(a.id);
                return (
                  <label key={a.id} className="ac-art">
                    <input type="checkbox" checked={mine.includes(a.id)} aria-label={`Pin ${a.id} on ${who}`}
                      onChange={(e) => setSharedPins(line.id, [a.id], e.target.checked)} />
                    <Badge tone={a.isReg ? 'amber' : 'blue'}>{a.isReg ? 'REG' : 'STD'}</Badge><code>{a.id}</code>
                    <span className="ac-grow">{a.name}{a.isReg && <small> · {a.norm}</small>}</span>
                    {at != null && at !== index && <small className="ac-tone" data-tone="brick">pinned on shared line {at + 1}</small>}
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
