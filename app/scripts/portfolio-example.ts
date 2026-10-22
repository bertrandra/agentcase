/**
 * Generates docs/examples/AgentCase_Portfolio_Example.json: the golden case as a 4-product portfolio of two waves (one product offset inside its wave) plus
 * one unscheduled product, a shared Knowledge Hub charged by entry headcount with a different knowledge subset per product, correlation rho 0.3 and a few
 * overrides. Written by the real export (`exportSnapshotJson`) after real controller calls, so it opens through the real open path
 * (tests/store/portfolio-example.test.ts). Usage (from app/): npx vite-node scripts/portfolio-example.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTeamTotal } from '@/controllers/baseline';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { addProduct, renameProduct, setActiveProduct, setProductNote, setProductOffset } from '@/controllers/product';
import { setPortfolioHub, setPortfolioRho } from '@/controllers/portfolio';
import { setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { addWave, renameWave, setWaveStart } from '@/controllers/wave';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc, setAppStore } from '@/store/instance';

setAppStore(createAppStore(makeDefaultDoc()));
await importSnapshotFile({ text: async () => readFileSync('fixtures/cases/golden.json', 'utf8') });
const a = appStore().getState().portfolio.products[0]!.id, w1 = appStore().getState().portfolio.waves[0]!.id;
renameProduct(a, 'Core platform'); renameWave(w1, 'Wave 1');
const b = addProduct('Payments', w1)!, w2 = addWave('Wave 2', 6)!, c = addProduct('Mobile app', w2)!, d = addProduct('Archive (not scheduled)', null)!;
setWaveStart(w2, 6);
setActiveProduct(b); setTeamTotal(24);
setActiveProduct(c); setTeamTotal(16);
setActiveProduct(d); setTeamTotal(8);
setProductOverride(b, 'regInclude', true);                 // Payments is regulated: the regulatory catalogue applies to it only
setProductOverride(c, 'values.engagementCtx', 'STA');      // Mobile app: another engagement context
setProductNote(c, 'Starts at month 6; its knowledge transfer is prepared 3 months earlier');
setProductNote(d, 'Not scheduled yet: excluded from the consolidation');
setProductOffset(b, 2);                                    // Payments starts 2 months after the beginning of Wave 1
setPortfolioHub({ enabled: true, infraMonthly: 3000, infraAllocation: 'byBaseEtp' });
setProductKnowledge(a, { domains: [{ label: 'Documentation', weightPct: 50 }, { label: 'Code', weightPct: 50 }] });
setProductKnowledge(b, { targetCC: 2, curationFTE: 1, setupBase: 90000, maturityAnswers: [1, 1, 2, 1, 2, 2, 1, 1, 2], domains: [{ label: 'Documentation', weightPct: 40 }, { label: 'Code', weightPct: 60 }] });
setProductKnowledge(c, { ktLeadMonths: 3, targetCC: 4, domains: [{ label: 'Operating procedures', weightPct: 100 }] });
setPortfolioRho(0.3);
setActiveProduct(a);
mkdirSync('../docs/examples', { recursive: true });
writeFileSync('../docs/examples/AgentCase_Portfolio_Example.json', exportSnapshotJson().json + '\n');
console.log('written docs/examples/AgentCase_Portfolio_Example.json');
