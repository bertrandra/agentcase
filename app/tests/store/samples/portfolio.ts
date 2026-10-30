import { addWave, assignWave, removeWave, renameWave, reorderWave, setWaveNote, setWaveStart } from '@/controllers/wave';
import { setDisplayScope } from '@/controllers/displayScope';
import { setMaxConcurrentSetups, setWaveDependency } from '@/controllers/waveDeps';
import { setPortfolioHorizon, setPortfolioHub, setPortfolioRho } from '@/controllers/portfolio';
import { clearProductOverride, applyOverrideToCommon, applySubsetFieldToCommon, setProductKnowledge } from '@/controllers/productOverrides';
import { addProduct, archiveProduct, duplicateProduct, removeProduct, renameProduct, setActiveProduct, setEditScope, setProductNote,
  setProductOffset } from '@/controllers/product';
import { appStore } from '@/store/instance';
import type { Sample } from './types';
import { setScopeOverride } from '../../helpers/scope';

const pfs = () => appStore().getState().portfolio;
const first = (): string => pfs().products[0]!.id;
const wave = (): string => pfs().waves[0]!.id;
const second = (): string => { const id = addProduct('Second'); if (!id) throw new Error('addProduct failed'); return id; };
let other = '', w2 = '';
const two = () => { other = second(); };
const withWave = () => { two(); w2 = addWave('Wave B', 6)!; };
const overridden = () => { setScopeOverride(first(), { selectedArtefacts: ['x'] }); };

/** One sample call per portfolio command (product, wave, portfolio). */
export const samples: Record<string, Sample> = {
  'product.add': () => { addProduct('Second'); },
  'product.rename': () => { renameProduct(first(), 'Renamed'); },
  'product.duplicate': () => { duplicateProduct(first(), 'Copy'); },
  'product.archive': { prep: two, run: () => { archiveProduct(other); } },
  'product.remove': { prep: two, run: () => { removeProduct(other); } },
  'product.setNote': () => { setProductNote(first(), 'A note'); },
  'product.setOffset': () => { setProductOffset(first(), 3); },
  'product.setActive': { prep: two, run: () => { setActiveProduct(other); } },
  'product.setEditScope': () => { setEditScope('product'); },
  'portfolio.setDisplayScope': () => { setDisplayScope({ kind: 'portfolio' }); },
  'product.setOverride': () => { overridden(); },
  'product.clearOverride': { prep: overridden, run: () => { clearProductOverride(first(), 'BPMN'); } },
  'product.applyToCommon': { prep: overridden, run: () => { applyOverrideToCommon(first(), 'BPMN'); } },
  'product.setKnowledge': () => { setProductKnowledge(first(), { targetCC: 2 }); },
  'product.applySubsetToCommon': { prep: () => { setProductKnowledge(first(), { targetCC: 1 }); },
    run: () => { applySubsetFieldToCommon(first(), 'targetCC'); } },
  'wave.add': () => { addWave('Wave B', 6); },
  'wave.rename': () => { renameWave(wave(), 'Renamed'); },
  'wave.remove': { prep: withWave, run: () => { removeWave(w2); } },
  'wave.reorder': { prep: withWave, run: () => { reorderWave(w2, 0); } },
  'wave.setStart': () => { setWaveStart(wave(), 4); },
  'wave.setNote': () => { setWaveNote(wave(), 'A note'); },
  'wave.assign': { prep: withWave, run: () => { assignWave(other, w2); } },
  'portfolio.setHorizon': () => { setPortfolioHorizon(48); },
  'portfolio.setRho': () => { setPortfolioRho(0.5); },
  'wave.setDependency': { prep: withWave, run: () => { setWaveDependency(w2, { waveId: wave(), milestone: 'setupEnd', lagMonths: 2 }); } },
  'portfolio.setMaxConcurrentSetups': () => { setMaxConcurrentSetups(1); },
  'portfolio.setHub': () => { setPortfolioHub({ enabled: true, infraMonthly: 1234 }); },
};
