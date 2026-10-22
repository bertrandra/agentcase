/**
 * Generates app/fixtures/portfolios/pf-three-products.json: the golden case as a 3-product, 2-wave portfolio file, written by the real export
 * (`exportSnapshotJson`, P2) after real controller calls. Used by the accessibility audit (`node tools/a11y.mjs --fixtures pf-three-products`).
 * Usage (from app/): npx vite-node scripts/portfolio-fixture.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setTeamTotal } from '@/controllers/baseline';
import { exportSnapshotJson, importSnapshotFile } from '@/controllers/files';
import { addProduct, setActiveProduct, setProductNote } from '@/controllers/product';
import { setProductOverride } from '@/controllers/productOverrides';
import { addWave, setWaveStart } from '@/controllers/wave';
import { createAppStore } from '@/store/core';
import { appStore, makeDefaultDoc, setAppStore } from '@/store/instance';

setAppStore(createAppStore(makeDefaultDoc()));
const golden = readFileSync('fixtures/cases/golden.json', 'utf8');
await importSnapshotFile({ text: async () => golden });
const first = appStore().getState().portfolio.products[0]!.id, wave1 = appStore().getState().portfolio.waves[0]!.id;
const b = addProduct('Paie', wave1)!, wave2 = addWave('Vague 2', 6)!, c = addProduct('Facturation', wave2)!;
setWaveStart(wave2, 6);
setActiveProduct(b); setTeamTotal(24);
setProductOverride(b, 'regInclude', true);
setProductOverride(c, 'values.engagementCtx', 'STA');
setProductNote(c, 'Démarre au mois 6');
setActiveProduct(first);
mkdirSync('fixtures/portfolios', { recursive: true });
writeFileSync('fixtures/portfolios/pf-three-products.json', exportSnapshotJson().json + '\n');
console.log('written fixtures/portfolios/pf-three-products.json');
