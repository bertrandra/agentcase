/**
 * Generates app/fixtures/portfolios/pf-three-products.json: the golden case as a 4-product, 2-wave portfolio file (one product offset by 2 months in its wave, one unscheduled), written by the real export
 * (`exportSnapshotJson`, P2; hub allocated by headcount and different knowledge subsets since P3b) after real controller calls. Used by the accessibility audit (`node tools/a11y.mjs --fixtures pf-three-products`).
 * Usage (from app/): npx vite-node scripts/portfolio-fixture.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTeamTotal } from '@/controllers/baseline';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { addProduct, setActiveProduct, setProductNote, setProductOffset } from '@/controllers/product';
import { setPortfolioHub } from '@/controllers/portfolio';
import { setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { addWave, setWaveStart } from '@/controllers/wave';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc, setAppStore } from '@/store/instance';

setAppStore(createAppStore(makeDefaultDoc()));
const golden = readFileSync('fixtures/cases/golden.json', 'utf8');
await importSnapshotFile({ text: async () => golden });
const first = appStore().getState().portfolio.products[0]!.id, wave1 = appStore().getState().portfolio.waves[0]!.id;
const b = addProduct('Payroll', wave1)!, wave2 = addWave('Wave 2', 6)!, c = addProduct('Billing', wave2)!;
setWaveStart(wave2, 6);
setActiveProduct(b); setTeamTotal(24);
setProductOverride(b, 'regInclude', true);
setProductOverride(c, 'values.engagementCtx', 'STA');
setProductNote(c, 'Starts in month 6');
// Waves (P4): a product with an offset inside its wave, and one product left out of every wave (unscheduled, flagged in the diagnostics)
setProductOffset(b, 2);
const d = addProduct('Archive (no wave)', null)!;
setProductNote(d, 'Unscheduled: excluded from the consolidation');
// Knowledge transfer (P3b): a shared hub charged by entry headcount, and a different subset per product
setPortfolioHub({ infraMonthly: 3000, infraAllocation: 'byBaseEtp' });
setProductKnowledge(b, { targetCC: 2, curationFTE: 1, setupBase: 90000, maturityAnswers: [1, 1, 2, 1, 2, 2, 1, 1, 2], domains: [{ label: 'Documentation', weightPct: 40 }, { label: 'Code', weightPct: 60 }] });
setProductKnowledge(c, { ktLeadMonths: 3, targetCC: 4, domains: [{ label: 'Operating procedures', weightPct: 100 }] });
setActiveProduct(b);   // the audit then sees a product with its own subset (chips, domains)
mkdirSync('fixtures/portfolios', { recursive: true });
writeFileSync('fixtures/portfolios/pf-three-products.json', exportSnapshotJson().json + '\n');
console.log('written fixtures/portfolios/pf-three-products.json');
