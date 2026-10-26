import surface from '@/content/refshare/calcengine-surface.json';
import { ADAPTERS } from '@/domain/time/adapters';
import { useCtx } from '@/store/hooks';
import { Badge, Callout } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { Tabs } from '@/ui/widgets/Tabs';
import { overlayRows } from './model';

const KIND: Record<string, string> = { domain: 'domain', time: 'domain/time', engine: 'engine method' };

function Surface() {
  const n = surface.entries.length;
  return (
    <div>
      <h2>Engine function surface <span className="ac-muted">— {n} entry points of the TypeScript engine (<code>src/domain</code>)</span></h2>
      <p className="ac-muted">Unlike the legacy page this list is authored, not discovered at runtime; a test checks that every name exists in the module it points to, so it cannot drift silently.</p>
      <DataTable rows={surface.entries} rowKey={(e) => `${e.kind}.${e.name}`} columns={[
        { key: 'fn', header: 'Function', render: (e) => <code>{e.name}()</code> }, { key: 'kind', header: 'Where', render: (e) => <Badge>{KIND[e.kind]}</Badge> },
        { key: 'what', header: 'What it does', render: (e) => e.what }, { key: 'legacy', header: 'Legacy v18.11', render: (e) => <code>{e.legacy}</code> },
      ]} />
      <p>Registered curve families (<code>ADAPTERS</code>, legacy <code>TIME.adapters()</code>): {Object.keys(ADAPTERS).map((id) => <Badge key={id} tone="teal">{id}</Badge>)}</p>
      <h3>Not ported, or internal only</h3>
      <ul>{surface.notPorted.map((x) => <li key={x.legacy}><code>{x.legacy}</code> — {x.why}</li>)}</ul>
    </div>
  );
}

const pct = (d: number | null) => (d === null ? '—' : d === 0 ? '0' : `${(d * 100).toFixed(1)}%`);

function Overlay() {
  const o = overlayRows(useCtx()), moved = o.rows.filter((r) => r.source === 'OVERLAID' && (r.delta ?? 0) > 0);
  return (
    <div>
      <h2>Overlay contract <span className="ac-muted">— {o.rows.filter((r) => r.source === 'OVERLAID').length} of {o.rows.length} fields rewritten by the engine, plus {o.nested.length} nested</span></h2>
      <p><code>model()</code> = <code>modelRaw()</code> + the curve overlay. Under any non-legacy curve the fields marked <b>OVERLAID</b> are replaced
        with values from <code>engineNow(ctx).year(y)</code>; the rest are <code>modelRaw()</code> pass-throughs. Under
        a <code>legacy.*</code> curve <code>model()</code> returns early and nothing is overlaid.</p>
      <Callout kind="warn">⚠ <b>The rule this table exists to make visible:</b> anything derived from an overlaid field must itself be overlaid, or it
        silently freezes at the pre-curve trajectory. A test compares <code>model()</code> with <code>modelRaw()</code> field by field on the oracle
        fixtures, so a forgotten overlay (or an undeclared one) fails the build.</Callout>
      <Callout>Δ measured live at the current settings — curve <code>{o.curve}</code>,
        horizon <b>{o.horizon}</b> years. <b>{moved.length}</b> overlaid fields differ from their pre-overlay value right now; the others are year-end
        point samples where the curve passes exactly through the ramp anchors.</Callout>
      <DataTable rows={[...o.rows, ...o.nested]} rowKey={(r) => r.field} columns={[
        { key: 'f', header: 'Field', render: (r) => <code>{r.field}</code> }, { key: 's', header: 'Source', render: (r) => <Badge tone={r.source === 'OVERLAID' ? 'amber' : 'grey'}>{r.source}</Badge> },
        { key: 'd', header: 'Δ vs modelRaw()', render: (r) => (r.source === 'OVERLAID' ? pct(r.delta) : '—') }, { key: 't', header: 'Type', render: (r) => r.type },
      ]} />
    </div>
  );
}

function Reach() {
  return (
    <div>
      <h2>Which sections reach the engine</h2>
      <p>The legacy page traced this by instrumenting the engine while rendering every section. In the TypeScript build there is one access path, so
        no trace is needed: components read the case through <code>useCaseResult()</code> (headline, payback, NPV, model)
        and <code>useCtx()</code> (inputs and working artefacts), both memoised once per document. By the porting rules a section that calls neither
        of the two does not reach the engine.</p>
    </div>
  );
}

/** Time Engine tab: function surface, overlay contract, access path. */
export function TimeEngine() {
  return <Tabs label="Time engine views" tabs={[
    { id: 'funcs', label: '🧩 Function surface', render: () => <Surface /> },
    { id: 'overlay', label: '🔀 Overlay contract', render: () => <Overlay /> },
    { id: 'reach', label: '🎯 Which sections reach it', render: () => <Reach /> },
  ]} />;
}
