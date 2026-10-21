import { clearFactoryData, loadDemoDataset } from '@/controllers/factoryActions';
import { ConfirmButton } from '@/ui/widgets/CommitField';
import { Panel } from '@/ui/widgets/cards';

/** Load the demo dataset or delete every factory record (both explicit, both undoable, neither touches the default case on disk). */
export function SampleData() {
  return (
    <Panel title="🧪 Sample data">
      <p className="ac-muted">A realistic, cross-linked sample dataset across the whole Factory Model / Release Pipeline / Engineering domain — useful for exploring the 📅 Factory Timeline. Both actions are runtime-only: they never affect the golden default state.</p>
      <div><ConfirmButton tone="primary" label="📦 Load demo dataset" confirmText="This replaces ALL current Factory Model data with a sample dataset. Confirm?" onConfirm={loadDemoDataset} /></div>
      <div><ConfirmButton label="🗑 Delete all Factory Model data" confirmText="This permanently deletes ALL Factory Model data (every array in this feature). Confirm?" onConfirm={clearFactoryData} /></div>
    </Panel>
  );
}
