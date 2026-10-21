import { appStore } from '@/store/instance';
import { fromSnapshot, toSnapshot } from '@/store/persistence/snapshot';

/** Download-ready JSON of the current case (legacy snapshot shape). */
export function exportSnapshotJson(): { filename: string; json: string } {
  const doc = appStore().getState().doc, name = (doc.customerName as string | undefined)?.trim() || 'case';
  return { filename: `AgentCase_${name.replace(/[^\w-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`, json: JSON.stringify(toSnapshot(doc)) };
}

/** Open a snapshot file. The previous case stays one Ctrl+Z away; a bad file leaves the current case untouched. */
export async function importSnapshotFile(file: { text(): Promise<string> }): Promise<void> {
  const doc = fromSnapshot(JSON.parse(await file.text()));
  appStore().load(doc, true);
}
