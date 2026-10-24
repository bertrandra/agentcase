import { goSection } from '@/ui/uiState';
import { Badge } from '@/ui/widgets/cards';
import { DATA, DRAWN, edgesOf, figuresOf, labelOf, LAYERS, SHARED } from './model';
import type { ZoneDef } from '@/domain/zones';

function Card({ z }: { z: ZoneDef }) {
  const e = edgesOf(z.id), figs = figuresOf(z.id), modules = DATA.zones.find((m) => m.id === z.id)?.modules ?? 0;
  const feeds = e.out.filter((x) => x[2] === 'z').length, fed = e.in.filter((x) => x[2] === 'z').length;
  const readers = e.out.filter((x) => x[2] === 'r').length + e.in.filter((x) => x[2] === 'w').length;
  return (
    <article className="ac-chip" data-zone={z.id} style={{ display: 'block', padding: 10, margin: '8px 0' }} aria-label={z.label}>
      <h3 style={{ margin: 0 }}>{z.label} <Badge tone={z.lane === 'input' ? 'blue' : z.lane === 'calc' ? 'amber' : 'grey'}>{z.lane}</Badge></h3>
      <p>{z.description}</p>
      <p className="ac-muted">{modules} tagged modules · feeds {feeds} zones · fed by {fed} zones · used by {readers} sections{z.lane !== 'shared' && <> · build layer {LAYERS.layer[z.id]}</>}</p>
      <p><strong>Entry modules:</strong> {z.entry.map((m) => <code key={m} style={{ marginRight: 8 }}>{m}</code>)}</p>
      {figs.length > 0 && (
        <table className="ac-table" aria-label={`Figures owned by ${z.label}`}>
          <thead><tr><th>Figure</th><th>Owner module</th><th>Sections that depend on it</th></tr></thead>
          <tbody>{figs.map((f) => (
            <tr key={f.id}>
              <td><strong>{f.label}</strong><br /><span className="ac-muted">{f.description}</span></td>
              <td><code>{f.owner}</code></td>
              <td><details><summary>{f.consumers.length} sections</summary><p style={{ maxWidth: 420 }}>{f.consumers.map((c) => <button key={c} type="button" className="ac-golink" style={{ marginRight: 8 }} onClick={() => goSection(c)}>{labelOf(c)}</button>)}</p></details></td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </article>
  );
}

/** One card per calculation zone: purpose, owner modules, the figures it owns (one owner each) and the sections that depend on them. */
export function Zones() {
  const owned = DATA.figures.length;
  return (
    <div>
      <h2>Zones &amp; figures <span className="ac-muted">— {DRAWN.length} calculation zones, {SHARED.length} shared, {owned} figures with exactly one owner each</span></h2>
      <p className="ac-muted">Every module under <code>src/domain</code> carries a <code>@calc-zone</code> tag and the module that owns a figure
        an <code>@owner</code> tag; <code>tests/domain/zones-tags.test.ts</code> enforces both, so a number has one source and no second copy of its
        formula. A section depends on a figure when the import closure of what it touches reaches the owner module.</p>
      {LAYERS.order.map((id) => <Card key={id} z={DRAWN.find((z) => z.id === id)!} />)}
      <h3>Shared zones (plumbing, never drawn as a dependency)</h3>
      {SHARED.map((z) => <Card key={z.id} z={z} />)}
    </div>
  );
}
