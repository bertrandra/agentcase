import content from '@/content/refshare/reference.json';
import { Badge, Callout, Stat, StatRow } from '@/ui/widgets/cards';
import { DataTable, type Column } from '@/ui/widgets/DataTable';
import { Rich } from '@/ui/widgets/Rich';
import { goSection } from '@/ui/uiState';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { SECTION_TITLES } from '@/ui/zones/registry';

type Row = (typeof content.rows)[number];
const TONE = { covered: 'teal', partial: 'amber', playbook: 'grey' } as const;
const count = (s: string) => content.rows.filter((r) => r.status === s).length;

const columns: Column<Row>[] = [
  { key: 'ref', header: 'Reference subchapter', render: (r) => <strong>{r.ref}</strong> },
  { key: 'summary', header: 'Summary', render: (r) => r.summary },
  { key: 'status', header: 'Coverage', align: 'center', render: (r) => <Badge tone={TONE[r.status as keyof typeof TONE]}>{r.statusLabel}</Badge> },
  { key: 'to', header: 'Section', align: 'center',
    render: (r) => <button type="button" className="ac-golink" onClick={() => goSection(r.to)}>{SECTION_TITLES[r.to] ?? r.label} →</button> },
];

/** Reference Map — coverage of the Software Engineering Delivery Model 2026 by AgentCase, one row per subchapter. */
export default function ReferenceSection() {
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      input={<><Callout>{content.intro}</Callout><StatRow>
        <Stat label="Covered" value={String(count('covered'))} tone="teal" />
        <Stat label="Partial" value={String(count('partial'))} tone="amber" />
        <Stat label="Playbook" value={String(count('playbook'))} tone="grey" />
        <Stat label="Subchapters" value={String(content.rows.length)} />
      </StatRow></>}
      result={<DataTable columns={columns} rows={content.rows} rowKey={(r) => r.ref} />}
      diagnostic={<Callout>{content.footnote}</Callout>} />
  );
}
