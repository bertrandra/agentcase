import { useMemo } from 'react';
import { formatFacts, portfolioFileExtras, workbookSheets, type SheetFact } from '@/controllers/dataModel';
import { PORTFOLIO_FIELDS } from '@/domain/portfolio/fields';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { FileIdentity } from './DocumentTab';

/** The persistence formats, and every sheet of the three workbooks, listed from the writers' own name constants. */
export function FilesTab() {
  const f = useMemo(formatFacts, []), sheets = useMemo(workbookSheets, []), extras = useMemo(() => portfolioFileExtras(Object.keys(PORTFOLIO_FIELDS)), []);
  const formats = [
    { id: 'Case snapshot (JSON)', what: <><code>{f.snapshotTag}</code>: one case. Written when the work re-opens to the very same portfolio (one product, one wave, no
      override, default names); opening it envelopes the case as Product 1 in Wave 1.</> },
    { id: 'Portfolio file (JSON)', what: <><code>{f.portfolioTag}</code>: the portfolio fields plus {extras.map((k) => <code key={k}>{k} </code>)}(stamps and
      calculation packages, never read back as input).</> },
    { id: 'HTML snapshot', what: <>The running page with the same JSON embedded in <code>&lt;script id=&quot;{f.htmlScriptId}&quot;&gt;</code>; legacy v18 HTML snapshots
      open too (parsed, never evaluated).</> },
    { id: 'Autosave record', what: <>The portfolio file (always the portfolio format) plus the undo history: see 🔄 Document vs view.</> },
    { id: 'Workbooks', what: <>Parameters (import and export), Results and Cost model (export only): sheets below.</> },
  ];
  return (
    <div>
      <h2>Persistence formats</h2>
      <p className="ac-muted">Every open path (file, HTML snapshot, embedded case, autosave, sessions) runs the same pipeline: sanitise → migrate to the
        current schema → validate and correct damaged values (each correction is a note) → the strict readers.</p>
      <FileIdentity />
      <DataTable caption="Persistence formats" rows={formats} rowKey={(r) => r.id} columns={[
        { key: 'f', header: 'Format', render: (r) => <b>{r.id}</b> }, { key: 'w', header: 'What it holds', render: (r) => r.what },
      ]} />
      <h2>Workbook sheets <span className="ac-muted">— {sheets.length} sheets, from the writers' sheet lists</span></h2>
      <p className="ac-muted">The parameters workbook's case sheets describe the common case; a real portfolio adds the portfolio sheets (columns as the
        writer declares them, checked on import). The results workbook of a portfolio holds the portfolio sheets, then per kept product its summary
        and its six case sheets.</p>
      <DataTable<SheetFact> caption="Workbook sheets" rows={sheets} rowKey={(r) => `${r.workbook}/${r.sheet}`} columns={[
        { key: 'b', header: 'Workbook', render: (r) => r.workbook }, { key: 'p', header: 'Part', render: (r) => <Badge>{r.part}</Badge> },
        { key: 's', header: 'Sheet', render: (r) => <code>{r.sheet}</code> }, { key: 'c', header: 'Columns', render: (r) => r.columns.join(' · ') },
      ]} />
    </div>
  );
}
