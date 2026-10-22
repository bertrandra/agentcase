import { appVerFileTag } from '@/domain/snapshots';
import { appStore } from '@/store/instance';
import { buildSnapshotHtml, snapshotFileName } from '@/store/persistence/html/embed';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';

/**
 * The running application as a single HTML file with the current case embedded (legacy saveHtmlSnapshot). `documentElement` is the live
 * page; the file re-hydrates from the embedded JSON when opened — the React tree is not serialised.
 */
export function htmlSnapshotFile(documentElement: Element, now: Date = new Date()): { filename: string; html: string } {
  const doc = appStore().getState().doc;
  return { filename: snapshotFileName(doc.customerName, appVerFileTag(), now), html: buildSnapshotHtml(documentElement, toPortfolioSnapshot(appStore().getState().portfolio, () => now)) };
}
