import { setTeamTotal } from '@/controllers/baseline';
import { addProduct, setActiveProduct } from '@/controllers/product';
import { setProductOverride } from '@/controllers/productOverrides';
import { LOCATIONS } from '@/domain';
import { phasesForScope } from '@/domain/scopeView';
import { EMPTY_HISTORY } from '@/store/history';
import { appStore } from '@/store/instance';
import { threeProducts, type Three } from './portfolioStore';
import { keysOf, setScopeOverride } from './scope';

export interface Varied extends Three { d: string }

/**
 * Three scheduled products (A, B in wave 1, C in wave 2) that differ on every input of the scope / frame / baseline groups, plus an unscheduled product D.
 * B: own artefact selection, a disabled phase, lifecycle weighting, MSI context, slow onboarding, own S-curve, own location mix, forced glass
 * ceiling, a bigger team.
 * C: regulated (MED norms), STA context. A inherits everything.
 */
export function variedProducts(): Varied {
  const t = threeProducts(), [a, b, c] = t.ids, pf0 = appStore().getState().portfolio;
  const d = addProduct('D', null)!;
  setScopeOverride(b, { selectedArtefacts: keysOf(pf0.common).selectedArtefacts.slice(0, 5), phaseOff: [phasesForScope()[0]!.id] });
  setProductOverride(b, 'lifecycleUse', true);
  setProductOverride(b, 'lifecyclePos', 70);
  setProductOverride(b, 'values.engagementCtx', 'MSI');
  setProductOverride(b, 'values.rmD1', '8');
  setProductOverride(b, 'scurve', { pts: [{ t: 1, a: 0 }, { t: 12, a: 20 }, { t: 24, a: 60 }, { t: 36, a: 90 }], family: 'gompertz', curve: '' });
  setProductOverride(b, 'targetLocPct', Object.fromEntries(LOCATIONS.map((l, i) => [l.name, i === 0 ? 20 : 80 / (LOCATIONS.length - 1)])));
  setProductOverride(b, 'forceGlassCeiling', true);
  setProductOverride(b, 'values.glassCeiling', '35');
  setProductOverride(c, 'values.engagementCtx', 'STA');
  setProductOverride(c, 'lifecycleUse', false);
  setProductOverride(c, 'values.industry', 'MED');
  setProductOverride(c, 'checked.regUse', true);
  setScopeOverride(c, { selectedNorms: ['MED:IEC 62304'], selectedRegArtefacts: ['R039'] });
  setActiveProduct(b); setTeamTotal(20); setActiveProduct(a);
  t.s.setHistory(EMPTY_HISTORY);
  return { ...t, ids: [a, b, c], d };
}
