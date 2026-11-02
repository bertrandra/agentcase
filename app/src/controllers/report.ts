/** @calc-zone exports */
import type { DisplayScope } from '@/domain/portfolio';
import { pfStressFingerprint } from '@/domain/portfolio';
import { appStore } from '@/store/instance';
import { currentPlanViews } from '@/store/planHooks';
import { planPages } from '@/store/persistence/report/plan';
import { pfSimStore } from '@/store/portfolioSimulation';
import { buildScopedReport, type ReportResult } from '@/store/persistence/report';
import { exportTheme } from './exportTheme';

/**
 * The Critical & Regulated Software Delivery report (read-only: nothing is written to the document). The scope is the store's display scope (not saved:
 * Product = the active product, Portfolio, Wave) unless given; a product other than the active one is asked for by `productId`. A plain single case,
 * and the Product scope, give today's report text for text. `plan`: the 📅 Plan pages (Gantt, WBS, histogram) of the display scope added at the end
 * (SPEC_FIXES FX-D15, optional; off = the report as before).
 */
export const criticalReport = (now: Date = new Date(), scope?: DisplayScope, productId?: string, opts: { plan?: boolean } = {}): ReportResult => {
  const { portfolio } = appStore().getState();
  const run = pfSimStore.getState().run, stress = run ? { run, stale: run.fingerprint !== pfStressFingerprint(portfolio) } : null;
  const r = buildScopedReport(portfolio, scope ?? portfolio.displayScope ?? { kind: 'product' }, exportTheme(), now, productId, stress);
  if (!r.ok || !opts.plan) return r;
  const at = r.html.lastIndexOf('</body>');
  return { ...r, html: `${r.html.slice(0, at)}${planPages(currentPlanViews(), exportTheme())}${r.html.slice(at)}` };
};
