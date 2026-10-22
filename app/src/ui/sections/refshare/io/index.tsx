import content from '@/content/refshare/io.json';
import { Rich } from '@/ui/widgets/Rich';
import { Tabs } from '@/ui/widgets/Tabs';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { CostModelPanel } from './CostModelPanel';
import { LaterTabs } from './LaterTabs';
import { ResultsExcelPanel } from './ResultsExcelPanel';
import { SaveTab } from './SaveTab';

/** Import / Export — the snapshot file works now; the Excel round-trip and the snapshot library are shown disabled until their release. */
export default function IoSection() {
  return (
    <SectionFrame title={content.title} help={<Rich nodes={content.help} />}
      result={<Tabs label="Import and export" tabs={[
        { id: 'savehtml', label: '💾 Save HTML', render: () => <SaveTab /> },
        { id: 'settings', label: '⬇️ Export / Import current settings', render: () => <LaterTabs which="settings" /> },
        { id: 'results', label: '📊 Results workbook', render: () => <><ResultsExcelPanel /><CostModelPanel /></> },
        { id: 'snapshot', label: '🗂️ Snapshot Manager', render: () => <LaterTabs which="snapshot" /> },
      ]} />} />
  );
}
