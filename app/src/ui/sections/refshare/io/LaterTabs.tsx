import content from '@/content/refshare/io.json';
import { Panel } from '@/ui/widgets/cards';
import { ParamsExcelPanel } from './ParamsExcelPanel';

const T = content.texts;

/** The settings tab is the parameters-workbook panel; the snapshot library is still a later release (shown disabled). */
export function LaterTabs({ which }: { which: 'settings' | 'snapshot' }) {
  if (which === 'settings') return <ParamsExcelPanel />;
  return <Panel title={T.managerTitle}><p>{T.managerText}</p><button type="button" className="ac-btn" disabled>Capture current configuration</button></Panel>;
}
