// Fixture recipes for the Model-Engine sections: the phases switched on through the legacy UI handlers (what a user does in the section).
const setIn = (id, v) => `document.getElementById('${id}').value='${v}';`;
const setCk = (id, v) => `document.getElementById('${id}').checked=${v};`;
export const RECIPES = [
  { id: 'me-lce', desc: 'P1 loop convergence on, edited p / review time / nmax / fallback, with EVT charging the tax',
    code: "lceEnable(true); mcvSetP(0,0.6); mcvSetP(1,0.7); mcvSetTRev(0,2); mcvSetTRev(1,1.5); mcvSetNMax(6); mcvSetFallback(800); evtEnable(true); mvtSetPhi('C0',0.1); mvtSetKappa('C0',0.5); mvtSetGamma('C0',1.5);" + setCk('vtaxApply', true) },
  { id: 'me-evt-direct', desc: 'P2 net mode, direct reliability, acknowledged negative net, regulated scope',
    code: "evtEnable(true); mvtSetMode('net'); mvtSetRSource('direct'); mvtSetRDirect(0.9); mvtSetAck(true); setRegUse(true); " + setIn('industry', 'MED') + " onIndustryChangedReg();" + setCk('vtaxApply', true) },
  { id: 'me-sup-hard', desc: 'P3 constrained (seeded then dialled down), ramp, DORA measured values, P1 on',
    code: "lceEnable(true); supEnable('constrained'); supSetSupervisors(1.5); supSetMode('soft'); supSetRampRate(0.2); supSetRampCap(3); doraSetMeasured('deployFreq',70000); doraSetMeasured('changeFailure',6); mvtSetPhi('C0',0.05);" },
  { id: 'me-sup-prov', desc: 'P3 provisioned with a day-rate override',
    code: "supEnable('provisioned'); supSetSupervisorCost(90000);" },
  { id: 'me-flow', desc: 'P5 five-year horizon, logistic curve, sponsor margin and throughput share',
    code: setIn('horizon', '5') + " TIME_ACTIVE_CURVE='logistic.default'; SC_FAMILY='logistic'; flowSetMarginPerMonth(80000); flowSetThroughputShare(60); flowSetDiscountRate(0.1); flowSetWipMeasured(4);" },
  { id: 'me-flow-capped', desc: 'P5 measured lead time, throttled by a binding supervision cap',
    code: "supEnable('constrained'); supSetSupervisors(1); flowSetMarginPerMonth(30000); flowSetThroughputShare(100);" },
  { id: 'me-flow-measured', desc: 'P5 measured lead-time override',
    code: "flowSetCycleTimeOverride(7); flowSetMarginPerMonth(10000); flowSetThroughputShare(25);" },
  { id: 'me-mcs', desc: 'P4 stochastic layer on with P1/P3 drivers live, baseline drift, evidence ledger entries',
    code: "lceEnable(true); supEnable('constrained'); supSetSupervisors(2.5); mcsEnable(); mcsSetRho(0.5); cbdSetDrift(0.04); evlSetTier('p','MEASURED'); evlSetSource('p','pilot log'); evlSetAsOf('p','2099-01-01'); evlSetTier('dayRate','BENCHMARK'); evlSetTier('tokenPrice','MEASURED'); evlSetStage('gateReview');" },
];
