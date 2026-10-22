import { appStore } from '@/store/instance';
import { checkLoadedCase } from './calcStaleness';
import { openSnapshot, toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';

/** Download-ready JSON of the current work: the legacy single-case shape when the portfolio is one plain case (F22), else `agentcase.portfolio.v1`. */
export function exportSnapshotJson(): { filename: string; json: string } {
  const doc = appStore().getState().doc, name = (doc.customerName as string | undefined)?.trim() || 'case';
  return { filename: `AgentCase_${name.replace(/[^\w-]+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`, json: JSON.stringify(toPortfolioSnapshot(appStore().getState().portfolio)) };
}

/** Open a snapshot file (single case or portfolio). The previous work stays one Ctrl+Z away; a bad file leaves it untouched. */
export async function importSnapshotFile(file: { text(): Promise<string> }): Promise<void> {
  const raw: unknown = JSON.parse(await file.text()), pf = openSnapshot(raw);
  appStore().load(pf, true);
  checkLoadedCase(raw, pf);
}
