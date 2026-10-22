/** One-token mutations for `validate-affected.ts`: harmless (still compiles, still loads) but they change a number or a text the tests look at. Each `find` occurs exactly once. */
export interface Mutation { file: string; find: string; replace: string; why: string }

export const MUTATIONS: Mutation[] = [
  { file: 'src/domain/stress/sensitivity.ts', find: "impactFte: '±2 FTE', roiImpact: '±0.8x'", replace: "impactFte: '±2 FTE', roiImpact: '±0.7x'", why: 'stress: a sensitivity label' },
  { file: 'src/domain/verdict/rank.ts', find: 'o.score = sw ? Math.round(acc / sw) : 0;', replace: 'o.score = sw ? Math.floor(acc / sw) : 0;', why: 'verification-verdict: strategy score rounding' },
  { file: 'src/domain/nav/fastPath.ts', find: "s.id === 'home'", replace: "s.id === 'homeX'", why: 'workspace-config: Fast Path keeps Welcome' },
  { file: 'src/domain/tune/readiness.ts', find: "label: 'Documentation'", replace: "label: 'Documentations'", why: 'tuning-programme: a readiness dimension label' },
  { file: 'src/domain/verifyB/velocityUplift.ts', find: '/ v0 * 100) : 0', replace: '/ v0 * 100) + 1 : 0', why: 'delivery-views: velocity uplift' },
  { file: 'src/domain/economics/costReduction.ts', find: 'net: (sav - setup) / base,', replace: 'net: (sav - setup) / base * 1.01,', why: 'economics-headline: saving % over the horizon' },
  { file: 'src/domain/portfolio/waveOps.ts', find: '{ ...p, waveId: null }', replace: '{ ...p, waveId: p.waveId }', why: 'portfolio-consolidation: removing a wave unassigns its products' },
  { file: 'src/domain/knowledge.ts', find: 'x >= 85 ? 4', replace: 'x >= 80 ? 4', why: 'knowledge-hub: as-is capability class' },
  { file: 'src/domain/portfolio/aggVerifyKpi.ts', find: "metric: 'Run cost / year'", replace: "metric: 'Run cost per year'", why: 'aggregate-views: a KPI row label' },
  { file: 'src/store/persistence/report/render.ts', find: '<h1>Critical &amp; Regulated Software Delivery Model</h1>', replace: '<h1>Critical &amp; Regulated Software Delivery Models</h1>', why: 'exports: report title' },
  { file: 'src/ui/sections/economics/financial/Decomp.tsx', find: "'= Net automation'", replace: "'= Net automation total'", why: 'ui section: a Financial row label' },
  { file: 'src/ui/format.ts', find: '/ 1000))}k', replace: '/ 1001))}k', why: 'ui (untagged): thousands formatter' },
  { file: 'src/store/history.ts', find: 'COALESCE_MS = 800', replace: 'COALESCE_MS = 801', why: 'store (untagged): undo coalescing window' },
  { file: 'src/domain/baseline/apportion.ts', find: 'FTE_STEP = 0.5', replace: 'FTE_STEP = 0.25', why: 'rate-card-team: FTE rounding step' },
  { file: 'src/domain/time/years.ts', find: 'savings: sum.sav,', replace: 'savings: sum.sav * 1.001,', why: 'time-engine: yearly savings' },
];
