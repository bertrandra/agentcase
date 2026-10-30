/** @calc-zone exports */
import { hasAudit, withoutAudit } from '@/domain/audit';
import type { Portfolio } from '@/domain/portfolio';
import { appVerFileTag } from '@/domain/snapshots';
import { activeDoc } from '@/store/editBase';
import { appStore } from '@/store/instance';
import { buildSnapshotHtml, snapshotFileName } from '@/store/persistence/html/embed';
import { toPortfolioSnapshot } from '@/store/persistence/portfolioSnapshot';

/** True when the case (or a product's own process) holds audit data: the snapshot then asks whether to include it (F-B35). */
export const portfolioHasAudit = (pf: Pick<Portfolio, 'common' | 'products'>): boolean =>
  hasAudit(pf.common.BPMN) || pf.products.some((p) => p.overrides.BPMN !== undefined && hasAudit(p.overrides.BPMN));
export const snapshotHasAudit = (): boolean => portfolioHasAudit(appStore().getState().portfolio);

/** The portfolio without its audit data (the common process and every product's own process); the same object when it holds none. */
export function withoutAuditData(pf: Portfolio): Portfolio {
  const common = withoutAudit(pf.common.BPMN), products = pf.products.map((p) => {
    const own = p.overrides.BPMN, next = own ? withoutAudit(own) : own;
    return next === own ? p : { ...p, overrides: { ...p.overrides, BPMN: next } };
  });
  if (common === pf.common.BPMN && products.every((p, i) => p === pf.products[i])) return pf;
  return { ...pf, common: { ...pf.common, BPMN: common }, products };
}

/**
 * The running application as a single HTML file with the current case embedded (legacy saveHtmlSnapshot). `documentElement` is the live
 * page; the file re-hydrates from the embedded JSON when opened — the React tree is not serialised. Audit data (client information, interview
 * notes) is left out unless `includeAudit` (F-B35: the snapshot asks, default no).
 */
export function htmlSnapshotFile(documentElement: Element, now: Date = new Date(), includeAudit = false): { filename: string; html: string } {
  const doc = activeDoc(), pf = appStore().getState().portfolio;
  const name = snapshotFileName(doc.customerName, appVerFileTag(), now);
  return { filename: includeAudit && snapshotHasAudit() ? name.replace(/\.html?$/, '_contains_audit_data.html') : name,
    html: buildSnapshotHtml(documentElement, toPortfolioSnapshot(includeAudit ? pf : withoutAuditData(pf), () => now)) };
}
