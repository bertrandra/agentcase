import { DataTable } from '@/ui/widgets/DataTable';
import { Panel } from '@/ui/widgets/cards';

const LEVELS = [
  { id: 'CC0', text: 'No usable knowledge hub' }, { id: 'CC1', text: 'Basic documented knowledge' }, { id: 'CC2', text: 'Structured & searchable knowledge' },
  { id: 'CC3', text: 'Connected knowledge hub, agent-ready' }, { id: 'CC4', text: 'Fully connected, agent-accessible ecosystem' },
];

/** Connected Context Maturity scale CC0-CC4. */
export function CcScale() {
  return (
    <Panel title="Connected Context Maturity scale (CC0–CC4)">
      <DataTable rows={LEVELS} rowKey={(l) => l.id} columns={[
        { key: 'l', header: 'Level', render: (l) => <strong>{l.id}</strong> },
        { key: 't', header: 'Connected Context Maturity', render: (l) => l.text },
      ]} />
    </Panel>
  );
}
