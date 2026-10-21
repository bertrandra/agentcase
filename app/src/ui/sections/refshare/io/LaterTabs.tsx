import { ParamsExcelPanel } from './ParamsExcelPanel';
import { SnapshotManager } from './SnapshotManager';

/** The two secondary tabs of the io section: the parameters workbook and the snapshot library. */
export function LaterTabs({ which }: { which: 'settings' | 'snapshot' }) {
  return which === 'settings' ? <ParamsExcelPanel /> : <SnapshotManager />;
}
