/** @calc-zone exports */
import { activeDoc } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';
import { openParsed } from './openFile';

/** Download-ready JSON of the current work: the legacy single-case shape when the portfolio is one plain case (F22), else `agentcase.portfolio.v1`. */
export function exportSnapshotJson(): { filename: string; json: string } {
  const doc = activeDoc(), name = (doc.customerName as string | undefined)?.trim() || 'case';
  return { filename: `AgentCase_${name.replace(/[^\w-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`,
    json: JSON.stringify(toPortfolioSnapshot(appStore().getState().portfolio)) };
}

/**
 * Open a JSON snapshot file (single case or portfolio) like every other open path: the potential is re-fitted to the scope when "Fit to selected scope"
 * is on (legacy applySnapshotState; before lot 4 this path skipped the re-fit, see docs/DEVIATIONS.md DEV-SNAPSHOT-RESTORE). The previous work stays one
 * Ctrl+Z away; a file that cannot be opened leaves it untouched.
 */
export async function importSnapshotFile(file: { text(): Promise<string> }): Promise<void> {
  openParsed(JSON.parse(await file.text()) as unknown);
}
