# Deviations from the legacy file (AgentCase_v18_13_EN.html)

The legacy file is frozen. Where the new build (`app/`) intentionally computes or prints something differently, the deviation is recorded here and, for the oracle tests, in `app/tests/helpers/deviations.ts` (the machine-readable twin: the oracle comparison drops exactly the listed fields, with the reason, and a dedicated test asserts the new rule). Oracle fixtures (`app/fixtures`) are never regenerated.

Principle behind most entries: one calculation serves many displays.

Figures are the golden fixture unless stated. "Before" = the build at the start of this change, which matched the legacy.

| id | area |
|---|---|
| DEV-HEADLINE-OWNER | one economics headline (net, ROI, payback, NPV) |
| DEV-ROI-NOSETUP | one ROI null rule |
| DEV-DISCOUNT-RATE | one case discount rate |
| DEV-HORIZON-SUMS | horizon sums instead of 3-entry sums |
| DEV-MC-QUANTILE | one quantile estimator |
| DEV-PNEG-NAMES | unambiguous P(loss) names, labels and tones |
| DEV-ANCHOR-CLAMP | one anchor owner, velocity and lead time clamped |
| DEV-COMPARE-ENGINE | 3-way comparison reads the Time Engine |
| DEV-SCENARIO-FLAT | flat scenario model vs the main case |
| DEV-NEG-MONEY | one negative-amount convention |

## DEV-HEADLINE-OWNER — one economics headline

- Legacy: net, ROI and payback were re-derived in each place (Results, strategies, registry, verification chain, sensitivity, hub, scenarios), Results/strategies paying back on the annual series (`cumulative > 0` at a year end) while the KPI bar used the monthly engine (`cumulative >= 0`).
- v19: `domain/economics/headline.ts` `headline(c)` returns `{ totalBenefit, setup, net, roi, paybackMonth, paybackYear = ceil(month / 12), npv, npvRate }` from the Time Engine rows. Used by `resultsCore`, `evaluateStrategies`, `economicsView`, registry `roiPct` / `netProfit3y` / `cumSav3yr`, `calcChain`, `directionalSensitivity`, TE-07 / TE-08 audits. `annualPaybackMonth` (same file) serves the flat scenario model.
- Why: Results "Payback Year n" can never contradict the KPI bar "n months".
- Effect: none on the 107 fixtures (net, ROI and payback year identical to 1e-15 before and after; golden net €1,603,919, ROI 713 %, payback month 9 = Year 1).
- Tests: `tests/domain/headline.test.ts` (new: all fixtures, Results payback year == ceil(KPI payback months / 12), Financial view and registry read the same figures).
- Files: `domain/economics/headline.ts`, `domain/verdict/{results,evaluate}.ts`, `domain/economics/view.ts`, `domain/pdc/vars/{global,finance,types}.ts`, `domain/pdc/{verifChain,verifSensi,verifConvTime}.ts`, `domain/index.ts`.

## DEV-ROI-NOSETUP — one ROI rule

- Legacy: engine `roi()` and thin `roi` gave `Infinity` (net > 0) or `0` when nothing was invested; the scenario model the same; the economics views gave `null`.
- v19: `roiCanonical(net, setup)` everywhere: `null` when `setup <= 0` or the net is not finite. Engine `roi()`, thin result and `scenarioModel().roi` are `number | null`. The scenario table still reads "∞ (no setup)" (decided on `setup` and `totBen`, not on the value).
- Strategies keep their own rule "no setup: no payback" (`payback = null`); the registry `roiPct` shows 0 for a null ROI.
- Tests touched: oracle fields `scenarioSet[].m.roi` and `thinNow.roi` skipped (reason in `deviations.ts`).
- Files: `domain/time/{engine,thin}.ts`, `domain/stress/{scenarios,scenarioView}.ts`, `ui/sections/stress/scenarios/Tables.tsx`.

## DEV-DISCOUNT-RATE — one case discount rate

- Legacy: 8 % hard-coded in `headline().npv`, the default repeated in `canonical.ts`, `mcs.ts`, `economics/view.ts`, `index.ts` (with different clamping).
- v19: `caseDiscountRate(c)` in `domain/canonical.ts` (`MODEL.CASE.discountRate`, 8 % when unset or not finite, clamped to [0, 1]) is the only owner. Engine `headline(annualRate)` takes the rate explicitly (no default). The separate "Flow and value" discount rate (time-to-market) is unchanged.
- Effect: none on the fixtures (no fixture stores a rate outside [0, 1]).
- Tests: `headline.test.ts` (rate 20 % reaches headline NPV, registry `npv8` and `computeCase`).
- Files: `domain/canonical.ts`, `domain/time/engine.ts`, `domain/model/mcs.ts`, `domain/economics/view.ts`, `domain/index.ts`, `domain/pdc/verifConvTime2.ts`.

## DEV-HORIZON-SUMS — horizon sums instead of three-entry sums

- Legacy: `model().yearSav` / `yearRun` always hold three entries, so sums over them are wrong for horizons other than 3 (a 1-year case summed three years, a 5-year case two too few).
- v19: sums use the horizon's years (`horizonYears(c)` / `headline`). Fixed-Y3 variables keep `[2]`.
  - `calcChain` row "ROI 3 years (net)" (label kept) and `directionalSensitivity` savings and ROI.
  - `hubView.dSav` (knowledge-hub delta).
  - `AdjustLive` chip: end-year savings, labelled `Y{n} savings`.
- Effect: none at horizon 3. Golden hub dSav −€206,309 unchanged; at horizon ≠ 3 (13 fixtures, e.g. horizon-5) `dSav` and the chain ROI / sensitivity read-outs now follow the horizon.
- Tests touched: `tests/domain/tuneB.test.ts` (hub: oracle at horizon 3, Δ net benefit assertion otherwise), `tests/domain/pdc-defend.test.ts` and `tests/ui/sections/verif.test.tsx` (chain ROI row and sensitivity observed text compared to the oracle only at horizon 3; otherwise the ROI row equals `fmtRoiPct(headline().roi)`, the labels and verdicts still match).
- Files: `domain/pdc/{verifChain,verifSensi}.ts`, `domain/tuneB/hub.ts`, `ui/sections/scope/scope-sel/AdjustLive.tsx`.

## DEV-MC-QUANTILE — one quantile estimator

- Legacy: the decision Monte Carlo (`runMonteCarlo`) took `sorted[floor(f * n)]`; the P4 layer interpolated.
- v19: both use `numerics.quantile` (linear interpolation).
- Effect (golden, 200 draws, seed 42): P10 1,522,925 → 1,522,838; P50 1,580,735 → 1,580,588; P90 1,635,140 → 1,634,511 (within one rank). `mean`, `cvar10`, `pNeg` unchanged. The verdict (P10 vs the setup floor) is unchanged on all fixtures.
- Tests touched: oracle fields `mcRun.stats.p10|p50|p90`, `decisionRun.stats.p10|p50|p90` skipped; new assertions in `stress.test.ts` (value == `quantile(draws)` and the legacy order statistic within one rank); `pdc-vars.test.ts` (variables `mcP10`, `mcP50`, `mcP90`, `monteCarloP50` == `quantile`); `ui/sections/montecarlo.test.tsx` (tolerance 1e-3 against the legacy p50).
- Files: `domain/stress/simulate.ts`.

## DEV-PNEG-NAMES — unambiguous P(loss) names, labels, tones; one name per run

- Two engines stay (their semantics differ): `runMonteCarlo` (decision layer; outcome = net benefit = savings − setup over the horizon) and `runMcs` (P4 layer; correlated driver draws; outcome = horizon-end-year savings).
- Fields: `McStats.pNeg` → `pNetNeg` (P(net benefit < 0)); `McsResult.stats.pNeg` → `pSavNeg` (P(horizon-end savings < 0)). Numbers unchanged. Label of the P4 tile: `P(Y{n} savings < 0)`.
- Tone: `domain/stress/pNeg.ts` owns `PNEG_BRICK = 0.2` and `PNEG_AMBER = 0.1` and `pNegTone(p)` (brick above 0.2, amber above 0.1, else teal). `DI_THRESHOLDS.maxPNegForStrong` is `PNEG_BRICK`. Used by Results, Monte Carlo and the stochastic tile. Legacy: Results / Monte Carlo coloured red above 0.2 only; the stochastic tile amber above 0.1 only.
- Controllers: `modelRun.runSimulation` / `runSimulationAsync` → `runMcsSync` / `runMcsAsync` (the stress controller keeps `runSimulation`).
- Tests touched: `legacyNames()` in `deviations.ts` maps `pNetNeg` / `pSavNeg` back to `pNeg` before the oracle comparison (`extras.problems`, `modelEngine.test.ts`); three tests read `pNetNeg`.
- Files: `domain/stress/{pNeg,simulate,index}.ts`, `domain/model/mcs.ts`, `domain/verdict/decision.ts`, `domain/pdc/vars/engine.ts`, `controllers/modelRun.ts`, UI: `verdict/results`, `stress/montecarlo/RunResults`, `model-engine/{stochastic,evidence,shared}`.

## DEV-ANCHOR-CLAMP — one anchor / performance owner; velocity and lead time stay inside their anchors

- Legacy / before: `model/flow.ts` and `pdc/perf.ts` carried their own copies of `perfRel`, `refAvgAgent`, `anchorClamp`, `daGet` and the default DORA table. The registry and the story interpolated velocity as `35 + 24 × rel` and lead time as `21 − 20 × rel` (fixed anchors, no clamp), so a realisation above 1 printed a velocity beyond the 59 SP elite target and a negative lead time.
- v19: one owner, `domain/verifyB/{anchors,perf}.ts`; the copies are deleted. `perfCoef` falls back per coefficient (missing, undefined or not finite gives 1.4 / 0.85, never NaN). Registry `velocitySpY3` / `leadTimeY3Days` and the story velocity go through `daVal`: the case's own anchor, clamped to [as-is, target].
- Effect (golden, realisation 1.4): velocity 68 SP → 59 SP; lead time −6.2 d → 1.0 d; story "delivery velocity" +94 % → +69 %. 96 of 107 fixtures change on the story line, 97 on at least one of the three variables. One fixture has a custom lead-time anchor (30 d): its value now follows it.
- Tests touched: `pdc-vars.test.ts` (the two variables recomputed from the oracle's `perfUpliftRelY3Pct` and the case anchors), `pdc-present.test.ts`, `ui/sections/story-summary.test.tsx` (legacy velocity % mapped through `legacyVelocityRow`, the legacy number ignored in the number-by-number check).
- Files: delete `domain/pdc/perf.ts`; `domain/model/flow.ts`, `domain/pdc/{playback,story,dd}.ts`, `domain/pdc/vars/tune.ts`, `domain/verifyB/perf.ts`.

## DEV-COMPARE-ENGINE — 3-way comparison reads the Time Engine

- Legacy: the "Agentic" trajectory read `m.yearRun[min(y, 2)]`, `yearETP`, `ramps` (year 3 repeated beyond 3 years) and accumulated `baselineRun − run − setup`.
- v19: it reads the engine's year rows: FTE = `humanFteEnd`, cost = `totalRunCost + setupCost`, velocity from `adoptionEndPct`, cumulative saving = `cumulativeCashFlowEnd` (includes knowledge-transfer avoided, verification tax and rework), agent vFTE = `agentVfteEnd`.
- Effect (golden): cumulative saving Y1 / Y2 / Y3 €127,185 / €699,197 / €1,582,287 → €131,887 / €712,364 / €1,603,919; cost, FTE, velocity unchanged. Beyond 3 years (horizon-5: Y4 cost €885,709 → €713,292) and off the typed ramps (curve-logistic velocity 42 / 50 / 63 → 41 / 52 / 60) the series now differ.
- Tests touched: oracle fields `compareView.save[2]` and `compareView.table[3]` skipped; `fte`, `cost`, `velo` and the table compared to the oracle only when horizon ≤ 3 and the year-end adoption equals the typed ramps; a new test asserts the series equal the engine rows for every fixture; `ui/sections/compare.test.tsx` ignores the legacy figures of the two affected table rows.
- Files: `domain/stress/compare.ts`.

## DEV-SCENARIO-FLAT — the flat scenario model does not equal the main case (documented, not changed)

`scenarioModel` is the flat annual model: the year-end team size is held for the whole year, setup is paid up front, and it carries none of the overlays (knowledge hub, KT avoided, verification tax, rework, change-management and hub setup). Pinned by `tests/domain/scenarioReconcile.test.ts`:

- On the legacy flat curve it reconciles to the euro: `m.yearSav[i] = scenario.yearSav[i] − khRun + ktAvoided − vTax − ext`, `m.setupTotal − scenario.setup = changeCost + khSetup` (cases curve-legacy, golden forced to flat, kh-off, baseline-pins-med), and the scenario ROI is never below the main ROI.
- On the real adoption curve (default) the monthly ramp makes the main case later and smaller. Golden, "AI + Location": benefit +32 % (over the 107 fixtures the gap runs from +6 % to +160 %, with one outlier at +490 %; the test band is 0 to +70 % on golden / curve-logistic / ctx-msi / industry-med), setup €135,000 vs €225,000, ROI 16.9 vs 7.1, payback month 4 vs 9.
- Decision: not rebased on the engine now (the six-scenario oracle is a flat-model oracle). The gap is recorded and bounded; a rebase would be the next step if the scenario screen must agree with the headline.
- Payback in the scenario table uses `annualPaybackMonth` (linear inside the year, setup up front); the engine spreads the setup over six months, so the two are not comparable on the flat curve either.

## DEV-NEG-MONEY — one negative-amount convention: "−€1,234"

- Findings (negative amount printed as): `−€1,234` with U+2212 (`stress/fmt.ts`, `model-engine/shared.tsx` fmtEur, `verdict/strategies/MetricTable.tsx`); `-€1,234` ASCII (`ui/format.ts` fmtEurK, `ui/economicsFormat.ts` fmtSigned, `Decomp.tsx`); `(€1,234)` (`ui/economicsFormat.ts` fmtParen, `Pl.tsx`, `stress/scenarioView.ts` fmtSigned); `€-1,234` (every plain `€${…}` formatter: see the list below).
- Convention chosen: `−€1,234`, U+2212 before the euro sign (already the most used among the formatters that handle the sign explicitly, and the typographically correct minus).
- Applied (minimal, the formatters are not yet collapsed in this tree): `ui/format.ts` fmtEurK, `ui/economicsFormat.ts` fmtE / fmtK / fmtSigned (fmtParen removed; fmtSigned is fmtE), `Pl.tsx`, `Decomp.tsx`, `AdjustLive.tsx` (strips either sign), `stress/scenarioView.ts` fmtE / fmtSigned. A negative that rounds to zero prints without a sign.
- Still printing `€-x` for a negative (to be given the sign at the single owner once the formatters are collapsed): `ui/sections/tuneB/fmt.ts` (eur, eurK), `ui/sections/baseline/fmtK.ts`, `ui/sections/model-engine/shared.tsx` (fmtK), `ui/widgets/tuneA.tsx` (fmtK), `store/persistence/report/render.ts` (fmtK), `store/persistence/excel/dd/pack.ts` (kEuro), `domain/verifyB/kpi.ts` (fmtK), `domain/pdc/verifFormat.ts` (fmtK, fmtE: the verification tables compare cell by cell with the legacy), `domain/stress/compare.ts` (fmtK), `ui/sections/verifyA/agent-detail/Runs.tsx` (eur), `ui/sections/configure/board/format.ts` (EUR_M).
- Tests touched: `legacyMoney()` in `deviations.ts` maps the legacy forms ("€-15K", "-€15K", "(€15,379)") to the convention; used by `helpers/economics.ts` (`diffs`, `missingCells`, `squash`), `helpers/pdc.ts` (`sq`), `helpers/parity.ts` (`numberTokens` reads any of the four forms as the same negative number), `economics.test.ts`, `story-summary.test.tsx`; `monthly.test.tsx` asserts the new sign.
- Files: see Applied.
