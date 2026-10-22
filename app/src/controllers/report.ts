import type { DisplayScope } from '@/domain/portfolio';
import { pfStressFingerprint } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { pfSimStore } from '@/store/portfolioSimulation';
import { buildScopedReport, type ReportResult } from '@/store/persistence/report';

/**
 * The Critical & Regulated Software Delivery report (read-only: nothing is written to the document). The scope is the store's display scope (not saved:
 * Produit = the active product, Portefeuille, Vague) unless given; a product other than the active one is asked for by `productId`. A plain single case, and the Produit scope, give today's report text for text.
 */
export const criticalReport = (now: Date = new Date(), scope?: DisplayScope, productId?: string): ReportResult => {
  const { portfolio } = appStore().getState();
  const run = pfSimStore.getState().run, stress = run ? { run, stale: run.fingerprint !== pfStressFingerprint(portfolio) } : null;
  return buildScopedReport(portfolio, scope ?? portfolio.displayScope ?? { kind: 'product' }, now, productId, stress);
};
