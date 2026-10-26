import { useMemo } from 'react';
import { formatFacts } from '@/controllers/dataModel';
import { usePortfolio } from '@/store/hooks';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { commonKeyRows, fieldRows, levels, type FieldRow } from './docModel';

/** File identity of a saved work: tags, schema version, migration chain — the readers' and writers' own constants. */
export function FileIdentity() {
  const f = useMemo(formatFacts, []);
  return (
    <p>
      Single case <code>_schema: {f.snapshotTag}</code> · portfolio <code>_schema: {f.portfolioTag}</code>
      {' '}· every file stamped <code>{f.versionKey}: {f.schemaVersion}</code>
      {' '}(a file without it is v1) · migrations on open: {f.migrations.map((m) => <Badge key={m}>{m}</Badge>)}
    </p>
  );
}

/** The document hierarchy: one table per level, rows from the runtime field lists, values from the live portfolio. */
export function DocumentTab() {
  const pf = usePortfolio((p) => p), rows = useMemo(() => levels(pf), [pf]), common = useMemo(() => commonKeyRows(pf), [pf]);
  return (
    <div>
      <h2>Document hierarchy <span className="ac-muted">— the portfolio the store holds, {pf.products.length} products in {pf.waves.length} waves</span></h2>
      <p className="ac-muted">The store's source of truth is the portfolio; the case every section reads is derived from it (the active product's effective
        case). Each table lists the fields of one level, read from the runtime twin of its type (<code>domain/portfolio/fields.ts</code>: a field added to
        the type without it fails the type check), with its live value in this document.</p>
      <FileIdentity />
      {rows.map((l) => (
        <DataTable<FieldRow> key={l.id} caption={`${l.title} — ${Object.keys(l.set).length} fields`} rows={fieldRows(l.set, l.group, l.sample)}
          rowKey={(r) => r.field} columns={[
            { key: 'f', header: 'Field', render: (r) => <code>{r.field}</code> },
            { key: 'p', header: 'Presence', render: (r) => <Badge tone={r.presence === 'required' ? 'blue' : 'grey'}>{r.presence}</Badge> },
            { key: 'v', header: 'Live value', render: (r) => r.value }, { key: 'w', header: 'What it holds', render: (r) => r.what },
          ]} />
      ))}
      <h3>Common keys of note</h3>
      <p className="ac-muted">Keys of the common case (the 💾 State registry tab lists all of them) that are optional or easy to misplace.</p>
      <DataTable caption="Common keys of note" rows={common} rowKey={(r) => r.key} columns={[
        { key: 'k', header: 'Key', render: (r) => <code>{r.key}</code> },
        { key: 'p', header: 'In this document', render: (r) => (r.present ? '✓ present' : 'absent (default)') },
        { key: 'w', header: 'What it holds', render: (r) => r.what },
      ]} />
    </div>
  );
}
