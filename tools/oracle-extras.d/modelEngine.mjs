// Model-Engine read-outs (P1-P6) as the legacy app computes them: the contract of app/src/domain/model/{flow,supView,evidence,mcs}.ts.
// Evaluated in order after the state is collected; me_mcs runs the stochastic layer (MCS_LAST) so me_evlRun sees real tornado weights.
export const EXTRAS = {
  me_lce: "lceModel()",
  me_evt: "evtModel()",
  me_sup: "supModel()",
  me_dora: "doraReadout()",
  me_flow: "flowModel()",
  me_evlNoRun: "(MCS_LAST=null, evlModel())",
  me_mcs: "(function(r){ return { n: r.n, seed: r.seed, rho: r.rho, stats: r.stats, tornado: r.tornado, convergence: r.convergence }; })(runMcs(300, 777))",
  me_evlRun: "evlModel()",
};
