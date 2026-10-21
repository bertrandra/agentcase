import * as ev from '@/controllers/modelEvidence';
import * as fl from '@/controllers/modelFlow';
import * as lc from '@/controllers/modelEngine';
import * as st from '@/controllers/modelStochastic';
import * as su from '@/controllers/modelSupervision';
import type { Sample } from './types';

const lceOn = () => { lc.enableLce(true); };
/** One call per Model-Engine command type (completeness is asserted by the registry test). */
export const samples: Record<string, Sample> = {
  'model.lce.enable': () => lc.enableLce(true),
  'model.lce.recalibrate': { prep: () => { lceOn(); lc.setLceP(0, 0.6); }, run: () => { lc.recalibrateLce(); } },
  'model.lce.setP': { prep: lceOn, run: () => lc.setLceP(0, 0.6) },
  'model.lce.setTRev': { prep: lceOn, run: () => lc.setLceTRev(0, 2) },
  'model.lce.setNMax': () => lc.setLceNMax(7),
  'model.lce.setFallback': () => lc.setLceFallback(500),
  'model.evt.enable': () => lc.enableEvt(true),
  'model.evt.setMode': () => lc.setEvtMode('net'),
  'model.evt.setRSource': () => lc.setEvtRSource('direct'),
  'model.evt.setRDirect': () => lc.setEvtRDirect(0.5),
  'model.evt.setAck': () => lc.setEvtAck(true),
  'model.evt.setPhi': () => lc.setEvtPhi('C1', 0.2),
  'model.evt.setKappa': () => lc.setEvtKappa('C1', 0.5),
  'model.evt.setGamma': () => lc.setEvtGamma('C1', 1.5),
  'model.sup.enable': () => su.enableSup(true),
  'model.sup.setProvision': () => su.setSupProvision('constrained'),
  'model.sup.setMode': () => su.setSupMode('soft'),
  'model.sup.setSupervisors': () => su.setSupervisors(3),
  'model.sup.setSupervisorCost': () => su.setSupervisorCost(90000),
  'model.sup.setRampRate': () => su.setSupRampRate(0.2),
  'model.sup.setRampCap': () => su.setSupRampCap(3),
  'model.dora.setMeasured': () => su.setDoraMeasured('deployFreq', 70000),
  'model.mcs.enable': () => st.enableMcs(true),
  'model.mcs.setDraws': () => st.setMcsDraws(500),
  'model.mcs.setSeed': () => st.setMcsSeed(42),
  'model.mcs.setRho': () => st.setMcsRho(0.6),
  'model.cbd.toggle': () => st.toggleCbd(),
  'model.cbd.setDrift': () => st.setCbdDrift(0.05),
  'model.flow.setMargin': () => fl.setFlowMargin(50000),
  'model.flow.setDiscount': () => fl.setFlowDiscount(0.1),
  'model.flow.setShare': () => fl.setFlowShare(50),
  'model.flow.setCycleTime': () => fl.setFlowCycleTime(10),
  'model.flow.setWip': () => fl.setFlowWip(4),
  'model.flow.reset': { prep: () => fl.setFlowMargin(50000), run: () => fl.resetFlow() },
  'model.evl.enable': () => ev.enableEvl(true),
  'model.evl.setStage': () => ev.setEvlStage('gateReview'),
  'model.evl.setTier': () => ev.setEvlTier('p', 'MEASURED'),
  'model.evl.setSource': () => ev.setEvlSource('p', 'pilot log'),
  'model.evl.setAsOf': () => ev.setEvlAsOf('p', '2026-06-01'),
  'model.evl.setOwner': () => ev.setEvlOwner('p', 'A. Kim'),
};
