import { readFileSync } from 'node:fs';
import { setTeamTotal } from '@/controllers/baseline';
import { openCaseText } from '@/controllers/openFile';
import { addProduct, setActiveProduct, setProductNote, setProductOffset } from '@/controllers/product';
import { setPortfolioHub } from '@/controllers/portfolio';
import { setProductKnowledge, setProductOverride } from '@/controllers/productOverrides';
import { addWave, setWaveStart } from '@/controllers/wave';
import type { Portfolio } from '@/domain/portfolio';
import { EMPTY_HISTORY } from '@/store/history';
import { appStore } from '@/store/instance';
import { freshStore } from '../store/helpers';
import { loadFixture } from './fixtures';

export const pfNow = (): Portfolio => appStore().getState().portfolio;
export const fixtureText = (name: string): string => readFileSync(`fixtures/portfolios/${name}.json`, 'utf8');

/** A fresh store that has opened `fixtures/portfolios/<name>.json` through the real open path. */
export function openPortfolioFixture(name = 'pf-three-products'): Portfolio {
  freshStore();
  openCaseText(fixtureText(name));
  appStore().setHistory(EMPTY_HISTORY);
  return pfNow();
}

/**
 * A generated 4-product / 2-wave portfolio on the default case: one product offset inside its wave, one unscheduled, a hub shared by headcount,
 * knowledge subsets (with domains, KT lead), overrides of every kind (list, flag, form field) and notes. History starts empty.
 */
export function fourProducts(): Portfolio {
  const s = freshStore();
  const a = pfNow().products[0]!.id, w1 = pfNow().waves[0]!.id;
  const b = addProduct('Paie', w1)!, w2 = addWave('Vague 2', 6)!, c = addProduct('Facturation', w2)!, d = addProduct('Archivage (hors vague)', null)!;
  setWaveStart(w2, 6);
  setActiveProduct(b); setTeamTotal(12);
  setProductOverride(b, 'regInclude', true);
  setProductOverride(c, 'values.engagementCtx', 'STA');
  setProductOverride(c, 'selectedNorms', ['ISO 26262', 'DO-178C']);
  setProductNote(c, 'Démarre au mois 6'); setProductNote(d, 'Non planifié');
  setProductOffset(b, 2);
  setPortfolioHub({ enabled: true, infraMonthly: 3000, infraAllocation: 'byBaseEtp' });
  setProductKnowledge(b, { targetCC: 2, curationFTE: 1, setupBase: 90000, maturityAnswers: [1, 1, 2, 1, 2, 2, 1, 1, 2], domains: [{ label: 'Documentation', weightPct: 40 }, { label: 'Code', weightPct: 60 }] });
  setProductKnowledge(c, { ktLeadMonths: 3, targetCC: 4, enabled: true, domains: [{ label: 'Procédures d’exploitation', weightPct: 100 }] });
  setActiveProduct(a);
  s.setHistory(EMPTY_HISTORY);
  return pfNow();
}

/**
 * A regulated portfolio (legacy fixture `industry-med`: catalogue on, norms selected) with 4 products in 2 waves: one offset, one with its own norm list,
 * one with a hub subset and a KT lead, one unscheduled. History starts empty.
 */
export function regulatedPortfolio(fixture = 'industry-med'): Portfolio {
  const s = loadFixture(fixture), a = pfNow().products[0]!.id, w1 = pfNow().waves[0]!.id;
  const b = addProduct('Paie', w1)!, w2 = addWave('Vague 2', 6)!, c = addProduct('Facturation', w2)!, d = addProduct('Archivage (hors vague)', null)!;
  setWaveStart(w2, 6); setProductOffset(b, 2); setProductNote(d, 'Non planifié');
  setProductOverride(b, 'selectedNorms', pfNow().common.selectedNorms.slice(0, 1));
  setPortfolioHub({ enabled: true, infraMonthly: 3000, infraAllocation: 'byBaseEtp' });
  setProductKnowledge(c, { ktLeadMonths: 3, targetCC: 3, domains: [{ label: 'Docs', weightPct: 100 }] });
  setActiveProduct(a);
  s.setHistory(EMPTY_HISTORY);
  return pfNow();
}
