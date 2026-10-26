import { evlModel } from '@/domain/model/evidence';
import { flowModel } from '@/domain/model/flow';
import { model } from '@/domain/model/overlay';
import {
  convergenceByProduct, evidenceByProduct, flowByProduct, productCtx, stochasticByProduct, supervisionByProduct, verificationByProduct,
} from '@/domain/portfolio';
import { fmtEurOrNA as fmtEur, fmtEurK } from '@/ui/format';
import { pfSimStore } from '@/store/portfolioSimulation';
import { pf } from './portfolioUi';

/** The evaluation date the sections pass (`useEvalDate`: today at local midnight). */
const TODAY = ((d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime())(new Date());

const pct1 = (v: number): string => `${(v * 100).toFixed(1)}%`;
const onOff = (b: boolean): string => (b ? 'ON' : 'OFF');
export const run = () => pfSimStore.getState().run;

/** The model-engine sections of vue-model-engine.test.tsx: per section, the figures a product row, the roll-up and the drill-down show. */
export interface Spec {
  id: string; title: RegExp; caption: RegExp;
  shown: (id: string) => string[];
  total: (ids: string[]) => string[];
  drill: { caption: RegExp; shown: (id: string) => string[] };
}
export const SPECS: Spec[] = [
  { id: 'model-stochastic', title: /Stochastic layer & baseline drift/, caption: /Stochastic layer by product/,
    shown: (id) => { const r = stochasticByProduct(pf(), [id], run()).rows[0]!; return [onOff(r.on), String(r.seed), r.draws.toLocaleString('en-US'),
      r.p50 === null ? '—' : fmtEur(r.p50)]; },
    total: (s) => { const a = stochasticByProduct(pf(), s, run()); return [`${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Stochastic layer of the product/,
      shown: (id) => { const r = stochasticByProduct(pf(), [id], run()).rows[0]!; return [String(r.seed),
      r.p50 === null ? 'Not in the last portfolio simulation' : fmtEur(r.p50)]; } } },
  { id: 'model-convergence', title: /Loop convergence economics/, caption: /Loop convergence by product/,
    shown: (id) => { const r = convergenceByProduct(pf(), [id]).rows[0]!; return [r.weightedEN.toFixed(2), `${r.escapePct.toFixed(1)}%`, onOff(r.on),
      String(r.loops)]; },
    total: (s) => { const a = convergenceByProduct(pf(), s); return [`${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Loop convergence economics/, shown: () => [] } },
  { id: 'model-supervision', title: /Supervision — provisioned or constrained/, caption: /Supervision by product/,
    shown: (id) => { const r = supervisionByProduct(pf(), [id]).rows[0]!; return [r.supervisors.toFixed(1), r.needed.toFixed(1), fmtEurK(r.runCost),
      r.vfte.toFixed(1), r.constrained ? 'Constrained' : 'Provisioned']; },
    total: (s) => { const t = supervisionByProduct(pf(), s).totals; return [t.needed.toFixed(1), fmtEurK(t.runCost), t.vfte.toFixed(1)]; },
    drill: { caption: /Agent capacity vs supervision/, shown: (id) => [(model(productCtx(pf(), id)).yearAgentVfte[2] as number).toFixed(2)] } },
  { id: 'model-flow', title: /Flow & value/, caption: /Flow and value by product/,
    shown: (id) => { const r = flowByProduct(pf(), [id]).rows[0]!; return [`${r.ctNew.toFixed(1)} d`, r.wip.toFixed(1), `${(r.theta * 100).toFixed(0)}%`,
      r.flowNpv === null ? 'no margin given' : fmtEurK(r.flowNpv)]; },
    total: (s) => { const a = flowByProduct(pf(), s); return [a.wip.toFixed(1), `${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Cycle time & WIP/, shown: (id) => [`${flowModel(productCtx(pf(), id)).ctNew.toFixed(1)}d`] } },
  { id: 'model-evidence', title: /Evidence ledger/, caption: /Evidence by product/,
    shown: (id) => { const r = evidenceByProduct(pf(), [id], TODAY).rows[0]!; return [r.grade ?? 'n/a',
      r.score === null ? 'n/a' : `${(r.score * 100).toFixed(0)}%`, onOff(r.on)]; },
    total: (s) => { const a = evidenceByProduct(pf(), s, TODAY); return [a.worst ? `worst: ${a.worst}` : 'n/a']; },
    drill: { caption: /Evidence ledger of the product/, shown: (id) => [evlModel(productCtx(pf(), id), null, TODAY).grade ?? 'n/a'] } },
  { id: 'model-verification', title: /Verification tax/, caption: /Verification tax by product/,
    shown: (id) => { const r = verificationByProduct(pf(), [id]).rows[0]!; return [pct1(r.rate), pct1(r.rhoMax), pct1(r.phi), r.net ? 'Net' : 'Overlay']; },
    total: (s) => { const a = verificationByProduct(pf(), s); return [`lowest ${pct1(a.lowestRhoMax as number)}`, `${a.on} of ${a.rows.length} on`]; },
    drill: { caption: /Criticality class/, shown: () => [] } },
];
