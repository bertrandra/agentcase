import notes from '@/content/refshare/deps-notes.json';
import { Callout } from '@/ui/widgets/cards';
import { CYCLES, DATA, labelOf, LAYERS, zoneOf } from './model';

/** The build order of the zones: layers computed from the imports, the cycles reported, the links that point backwards listed. Read-only. */
export function BuildOrder() {
  const layers = [...new Set(Object.values(LAYERS.layer))].sort((a, b) => a - b);
  const modules = (id: string) => DATA.zones.find((z) => z.id === id)?.modules ?? 0;
  return (
    <div>
      <h2>Build order <span className="ac-muted">— {LAYERS.order.length} zones in {layers.length} layers, {LAYERS.feedback.length} feedback links set
        aside</span></h2>
      <Callout>{notes.buildOrderNote}</Callout>
      {layers.map((l) => (
        <div key={l} data-layer={l} className="ac-dep-layer">
          <strong className="ac-dep-layer-n">Layer {l}</strong>
          <div className="ac-dep-layer-zones">
            {LAYERS.order.filter((z) => LAYERS.layer[z] === l).map((z) => (
              <div key={z} className="ac-chip ac-dep-layer-zone">
                <strong>{zoneOf(z)!.label}</strong>
                <div className="ac-muted">{zoneOf(z)!.lane} · {modules(z)} modules · position {LAYERS.order.indexOf(z) + 1}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {!CYCLES.length && <Callout kind="green"><span data-acyclic>✅ <strong>No cycle</strong>: {DATA.edges.filter((e) => e[2] === 'z').length} zone
        links.</span> {notes.acyclicNote} {DATA.outer.length} {notes.outerNote}</Callout>}
      {CYCLES.map((c) => (
        <Callout key={c.join()} kind="warn"><span data-cycle={c.length}>🔁 <strong>Cycle of {c.length} zones</strong> (each reaches the others through
          imports): {c.map(labelOf).join(' · ')}.</span> {notes.cycleNote}</Callout>
      ))}
      <h3>Feedback links ({LAYERS.feedback.length})</h3>
      <p className="ac-muted">Imports that point backwards in the order above; the number is the count of module pairs. They are real dependencies, documented
        rather than hidden.</p>
      <ul>{LAYERS.feedback.map((e) => <li key={`${e[0]}>${e[1]}`}>{labelOf(e[0])} → {labelOf(e[1])} ({e[3]})</li>)}</ul>
    </div>
  );
}
