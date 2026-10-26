import { useDoc } from '@/store/hooks';
import { useSavedCase } from '@/store/portfolioHooks';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { goSection } from '@/ui/uiState';
import { GROUPS, SECTIONS, sectionById } from '@/ui/zones/registry';
import { COEF_ROWS, VARIABLES, nsRows, nsState, stateRows, type StateRow } from './model';

const Link = ({ id }: { id: string }) => {
  const s = sectionById(id);
  return s ? <button type="button" className="ac-golink" onClick={() => goSection(id)}>{s.label}</button>
    : <span className="ac-muted">{id || 'not yet exposed'}</span>;
};

/** Sections grouped by menu group in build order. */
export function SectionsTab() {
  return (
    <div>
      <h2>Sections <span className="ac-muted">— {SECTIONS.length} rows, grouped by menu group in build order</span></h2>
      <p className="ac-muted">Full editing (group, order, tag, MVP) lives in Persona management → Sections. This is a read-only, at-a-glance view.</p>
      {GROUPS.map((g) => {
        const rows = SECTIONS.filter((s) => s.group === g.id).sort((a, b) => a.groupSeq - b.groupSeq);
        if (!rows.length) return null;
        return (
          <div key={g.id}>
            <h3>{g.label} <span className="ac-muted">({rows.length})</span></h3>
            <DataTable rows={rows} rowKey={(s) => s.id} columns={[
              { key: 'section', header: 'Section', render: (s) => <><Link id={s.id} /> <code>{s.id}</code></> },
              { key: 'tag', header: 'Tag', render: (s) => <Badge>{s.tag ?? ''}</Badge> },
              { key: 'mvp', header: 'MVP', render: (s) => (s.mvp ? '✓' : '') },
              { key: 'desc', header: 'Description', render: (s) => s.description },
            ]} />
          </div>
        );
      })}
    </div>
  );
}

/** The keys of the live document: type, size and a preview of the value. */
export function StateTab() {
  const rows = stateRows(useSavedCase());
  return (
    <div>
      <h2>State registry <span className="ac-muted">— {rows.length} keys of the case, what a snapshot, the autosave and the Excel round-trip carry</span></h2>
      <p className="ac-muted">Live: the keys, types and sizes of the active product's effective case as a saved file writes it (common values + its overrides,
        knowledge
        subset and entry team; <code>currentPersona</code> is the persona the file opens on). An optional key that is unset (for example the themes) is absent
        until it is first written. The portfolio around the case is in the 🗂️ Document tab.</p>
      <DataTable<StateRow> rows={rows} rowKey={(r) => r.key} columns={[
        { key: 'key', header: 'Key', render: (r) => <code>{r.key}</code> }, { key: 'type', header: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'size', header: 'Size', render: (r) => r.size }, { key: 'preview', header: 'Current value (preview)', render: (r) => r.preview },
      ]} />
    </div>
  );
}

/** The bindable variables, read off the live registry of the Board. */
export function VariablesTab() {
  return (
    <div>
      <h2>Variable registry <span className="ac-muted">— {VARIABLES.length} variables the Board binds its cards to</span></h2>
      <p className="ac-muted">Read off the registry itself (<code>domain/pdc/variables.ts</code>): each entry is a getter over the case, so a variable is never
        stored — it is recomputed from the live case whenever a card shows it.</p>
      <DataTable rows={VARIABLES} rowKey={(v) => v[0]} columns={[
        { key: 'id', header: 'Id', render: (v) => <code>{v[0]}</code> }, { key: 'label', header: 'Label', render: (v) => v[1] },
        { key: 'format', header: 'Format', render: (v) => v[2] }, { key: 'unit', header: 'Unit', render: (v) => v[3] },
        { key: 'scope', header: 'Scope', render: (v) => v[4] },
      ]} />
    </div>
  );
}

/** Coefficients (default vs current) and MODEL namespaces. */
export function ModelTab() {
  const doc = useDoc((d) => d), cur = (doc.COEF ?? {}) as Record<string, unknown>, NS_ROWS = nsRows(doc);
  return (
    <div>
      <h2>Coefficients <span className="ac-muted">— {COEF_ROWS.length} tunable constants embedded in the maths</span></h2>
      <DataTable rows={COEF_ROWS} rowKey={(r) => r[0]} columns={[
        { key: 'key', header: 'Key', render: (r) => <code>{r[0]}</code> }, { key: 'what', header: 'What it does', render: (r) => r[1] },
        { key: 'dflt', header: 'Default', align: 'center', render: (r) => r[2] },
        { key: 'cur', header: 'Current', align: 'center', render: (r) => <b>{String(cur[r[0]] ?? '')}</b> },
        { key: 'home', header: 'Editable in', align: 'center', render: (r) => <Link id={r[3]} /> },
      ]} />
      <h2>MODEL namespaces <span className="ac-muted">— {NS_ROWS.length} namespaces holding everything not a per-section input</span></h2>
      <DataTable rows={NS_ROWS} rowKey={(r) => r[0]} columns={[
        { key: 'ns', header: 'Namespace',
          render: (r) => <><code>{r[0]}</code> {nsState(doc, r[0]).on !== null &&
          <Badge tone={nsState(doc, r[0]).on ? 'teal' : 'grey'}>{nsState(doc, r[0]).on ? 'on' : 'off'}</Badge>}</> },
        { key: 'what', header: 'What it holds', render: (r) => r[1] },
        { key: 'fields', header: 'Live fields', align: 'center', render: (r) => `${nsState(doc, r[0]).fields} fields` },
        { key: 'home', header: 'Home section', align: 'center', render: (r) => <Link id={r[2]} /> },
      ]} />
    </div>
  );
}
