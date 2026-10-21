import notes from '@/content/refshare/deps-notes.json';
import { Badge } from '@/ui/widgets/cards';
import { DataTable } from '@/ui/widgets/DataTable';
import { ALL_SECTIONS, labelOf, type DepsModel } from './useDeps';

/** One row per source section: what it drives (strong/soft chips) and the authored nature-and-impact text. */
export function Descriptions({ m }: { m: DepsModel }) {
  const rows = m.sources.map((id) => ALL_SECTIONS.find((s) => s.id === id)!);
  return (
    <div>
      <h2>Dependency descriptions &amp; impact</h2>
      <DataTable rows={rows} rowKey={(s) => s.id} empty="No dependency has been defined yet." columns={[
        { key: 's', header: 'Section', render: (s) => <><strong>{s.label}</strong> {s.tag && <Badge>{s.tag}</Badge>}</> },
        { key: 't', header: 'Impacts (downstream)', render: (s) => Object.entries(m.deps[s.id] ?? {}).map(([t, lv]) => <Badge key={t} tone={lv === 'S' ? 'blue' : 'amber'}>{labelOf(t)}</Badge>) },
        { key: 'd', header: 'Nature & impact', render: (s) => m.desc[s.id] ?? '' },
      ]} />
      <p className="ac-muted">{notes.provenance}</p>
    </div>
  );
}
