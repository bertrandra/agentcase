import { useDoc } from '@/store/hooks';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { goSection } from '@/ui/uiState';
import { GROUPS, SECTIONS, sectionById } from '@/ui/zones/registry';
import { COEF_ROWS, NS_ROWS, VARIABLES, nsState, stateRows, type StateRow } from './model';

const Link = ({ id }: { id: string }) => {
  const s = sectionById(id);
  return s ? <button type="button" className="ac-golink" onClick={() => goSection(id)}>{s.label}</button> : <span className="ac-muted">{id || 'not yet exposed'}</span>;
};

/** Sections grouped by menu group in build order. */
export function SectionsTab() {
  return (
    <div>
      <h3>Sections <span className="ac-muted">— {SECTIONS.length} rows, grouped by menu group in build order</span></h3>
      <p className="ac-muted">Full editing (group, order, tag, MVP) lives in Persona management → Sections. This is a read-only, at-a-glance view.</p>
      {GROUPS.map((g) => {
        const rows = SECTIONS.filter((s) => s.group === g.id).sort((a, b) => a.groupSeq - b.groupSeq);
        if (!rows.length) return null;
        return (
          <div key={g.id}>
            <h4>{g.label} <span className="ac-muted">({rows.length})</span></h4>
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
  const doc = useDoc((d) => d), rows = stateRows(doc);
  return (
    <div>
      <h3>State registry <span className="ac-muted">— {rows.length} keys, what survives snapshot save/restore, autosave and the Excel round-trip</span></h3>
      <p className="ac-muted">Live: type and size are read from the current document. A key that is not here does not survive closing the tab — this is the complete list, not a sample.</p>
      <DataTable<StateRow> rows={rows} rowKey={(r) => r.key} columns={[
        { key: 'key', header: 'Key', render: (r) => <code>{r.key}</code> }, { key: 'type', header: 'Type', render: (r) => <Badge>{r.type}</Badge> },
        { key: 'size', header: 'Size', render: (r) => r.size }, { key: 'preview', header: 'Current value (preview)', render: (r) => r.preview },
      ]} />
    </div>
  );
}

/** The bindable variables (frozen listing from the legacy registry; live values arrive with the Board). */
export function VariablesTab() {
  return (
    <div>
      <p className="ac-muted">The variable registry that the Board binds its cards to. In this build the listing is a content file; the live values appear with the Board section.</p>
      <DataTable rows={VARIABLES} rowKey={(v) => v[0]} columns={[
        { key: 'id', header: 'Id', render: (v) => <code>{v[0]}</code> }, { key: 'label', header: 'Label', render: (v) => v[1] },
        { key: 'format', header: 'Format', render: (v) => v[2] }, { key: 'unit', header: 'Unit', render: (v) => v[3] }, { key: 'scope', header: 'Scope', render: (v) => v[4] },
      ]} />
    </div>
  );
}

/** Coefficients (default vs current) and MODEL namespaces. */
export function ModelTab() {
  const doc = useDoc((d) => d), cur = (doc.COEF ?? {}) as Record<string, unknown>;
  return (
    <div>
      <h3>Coefficients <span className="ac-muted">— {COEF_ROWS.length} tunable constants embedded in the maths</span></h3>
      <DataTable rows={COEF_ROWS} rowKey={(r) => r[0]} columns={[
        { key: 'key', header: 'Key', render: (r) => <code>{r[0]}</code> }, { key: 'what', header: 'What it does', render: (r) => r[1] },
        { key: 'dflt', header: 'Default', align: 'center', render: (r) => r[2] },
        { key: 'cur', header: 'Current', align: 'center', render: (r) => <b>{String(cur[r[0]] ?? '')}</b> },
        { key: 'home', header: 'Editable in', align: 'center', render: (r) => <Link id={r[3]} /> },
      ]} />
      <h3>MODEL namespaces <span className="ac-muted">— {NS_ROWS.length} namespaces holding everything not a per-section input</span></h3>
      <DataTable rows={NS_ROWS} rowKey={(r) => r[0]} columns={[
        { key: 'ns', header: 'Namespace', render: (r) => <><code>{r[0]}</code> {nsState(doc, r[0]).on !== null && <Badge tone={nsState(doc, r[0]).on ? 'teal' : 'grey'}>{nsState(doc, r[0]).on ? 'on' : 'off'}</Badge>}</> },
        { key: 'what', header: 'What it holds', render: (r) => r[1] },
        { key: 'fields', header: 'Live fields', align: 'center', render: (r) => `${nsState(doc, r[0]).fields} fields` },
        { key: 'home', header: 'Home section', align: 'center', render: (r) => <Link id={r[2]} /> },
      ]} />
    </div>
  );
}
