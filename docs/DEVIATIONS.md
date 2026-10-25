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
| DEV-SCENARIO-ENGINE | the six scenarios run the Time Engine |
| DEV-NEG-MONEY | one negative-amount convention |
| DEV-PF-STRESS | the portfolio Monte Carlo and verdict (multi-product P6) |
| DEV-ARCH-CONTENT | the two architecture sections describe the TypeScript build |
| DEV-DEPS-ZONES | the Section Dependencies page shows the graph generated from the code, not the authored registry |
| DEV-MENU-STRUCTURES | several menu structures; each persona picks one; Business journey persona |
| DEV-BRAND-THEME | theme library, Brand & theme screen (an app section), `?theme=` links, customer logo |
| DEV-HEADER-MENU | header and top bar: title without subtitle, compact two-zone header, file menu, Show / Change, group bar without ☰ / persona |
| DEV-KPI-BAR | KPI bar shows FTE before / after, saving over the horizon, velocity; NPV moved to Results / Financial |
| DEV-UI-PARITY | cross-reference of `app/ui-parity-exceptions.json` (accessibility corrections, header decisions) |
| DEV-COSTMODEL-PILOT | the pilot cost is a dated line included in the cost-model totals (decision D4, lot 4); the app headline does not count it |
| DEV-APP-SECTION-PERSONAS | Brand & theme cannot be removed from its personas (current; lot 7 will change it) |
| DEV-THEME-SEQ-UNDO | known defect: a theme `seq` can be reissued after an undo (lot 3 fixes it) |
| DEV-PF-GAPS | portfolio features not built: shared teams (scenarios table, wave dependencies and setup capacity, Wave-view histogram, per-draw truncation: built in lot 7) |
| DEV-SNAPSHOT-RESTORE | the parallel run of the 107 case files: 2 legacy restore defects (bass / legacy curve), 1 fixed in the new build (File > Open… re-fit) |

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

## DEV-SCENARIO-ENGINE — the six scenarios run the Time Engine (replaces DEV-SCENARIO-FLAT)

- Legacy (and v19 until now): `scenarioModel` re-implemented team cost, tokens, infra, run team, yearly savings, ROI and payback on a flat annual basis: the year-end team held all year, the setup (tooling + training + coaching + governance only) paid up front, payback interpolated inside the year, none of the overlays. On the real adoption curve the scenario screen therefore disagreed with the main-case headline.
- v19: each scenario is the case's own Time Engine (`timeFor` on the raw model and the live curve, as `engineNow`) run with the scenario's levers (`Levers` in `time/kernel.ts`): AI off sets `eff = 0`, `aiActive = false`, no infra, no AI quality taxes and no setup (setup stays for the Ramp scenario, as before); the location lever sets the day-rate path (`asis` = ramp at 0 %, `target` = the case rate, `destination` = the `scenTargetLoc` rate, `ramp` = the engine's relocation ramp). The figures come from `headlineOf(engine, ctx)`, the one headline owner `headline(c)` also uses; savings and run cost are the engine's year rows; the cumulative chart reads the engine's cumulative series (`cumAt`). `annualPaybackMonth` is deleted.
- Consequence: the scenario that mirrors the main case's configuration ("AI + Location") returns exactly the main-case net, ROI, payback month and year, NPV and per-year savings / run cost, on every fixture, curve and horizon. The Ramp scenario now ramps month by month (the legacy stepped by whole years).
- Effect (golden, setup / 3-year savings / net / ROI / payback month), before then after:
  - AS-IS: 0 / 0 / 0 / n/a / none, unchanged (no payback shown).
  - AI only: €135,000 / €1,633,686 / €1,498,686 / 11.1 / 10, then €225,000 / €927,224 / €702,224 / 3.1 / 24.
  - Location only: €0 / €1,168,200 / €1,168,200 / n/a / immediate, unchanged figures (payback month 1 in the engine).
  - Ramp: €135,000 / €0 / −€135,000 / −100 % / none, then €225,000 / €0 / −€225,000 / −100 % / none (destination rate = AS-IS rate on golden).
  - AI + Location: €135,000 / €2,420,615 / €2,285,615 / 16.9 / 4, then €225,000 / €1,828,919 / €1,603,919 / 7.1 / 9, the main case (was +32 % benefit).
  - AI + 100 % destination: same as AI only on golden (before and after).
- Tests touched: oracle fields `scenarioSet[].m.{setup, dayRateByYear, yearETP, yearAgentVfte, yearTeamCost, yearToken, yearRun, yearSav, totBen, pbMonth}` skipped (`roi` was already skipped by DEV-ROI-NOSETUP; `dayRateByYear` is gone); `key`, `label`, `opts`, `base`, `baselineRun`, `horizon`, `tgtTJM`, `asisTJM`, `tgtRateTJM` still compared to the oracle. `scenarioReconcile.test.ts` rewritten: exact equality with the headline on all 107 fixtures and on five fixtures × six curves × horizons 1, 2, 3, 4, 6; per-scenario invariants (AS-IS has no saving, setup placement, cumulative series ends at the net and crosses 0 at the payback month, monotonicity in the day rate, ramp). The previous legacy-flat-curve reconciliation and the "+32 % / 4 vs 9" pin are gone with the flat model.
- Files: `domain/stress/scenarios.ts`, `domain/stress/scenarioView.ts`, `domain/time/kernel.ts` (levers), `domain/economics/headline.ts` (`headlineOf`; `annualPaybackMonth` removed). `stress/compare.ts` is untouched: its "classic" series is a separate hypothesis and its "agentic" series already reads the engine rows (DEV-COMPARE-ENGINE).

## DEV-NEG-MONEY — one negative-amount convention: "−€1,234"

- Findings (negative amount printed as): `−€1,234` with U+2212 (`stress/fmt.ts`, `model-engine/shared.tsx` fmtEur, `verdict/strategies/MetricTable.tsx`); `-€1,234` ASCII (`ui/format.ts` fmtEurK, `ui/economicsFormat.ts` fmtSigned, `Decomp.tsx`); `(€1,234)` (`ui/economicsFormat.ts` fmtParen, `Pl.tsx`, `stress/scenarioView.ts` fmtSigned); `€-1,234` (every plain `€${…}` formatter: see the list below).
- Convention chosen: `−€1,234`, U+2212 before the euro sign (already the most used among the formatters that handle the sign explicitly, and the typographically correct minus).
- Applied (minimal, the formatters are not yet collapsed in this tree): `ui/format.ts` fmtEurK, `ui/economicsFormat.ts` fmtE / fmtK / fmtSigned (fmtParen removed; fmtSigned is fmtE), `Pl.tsx`, `Decomp.tsx`, `AdjustLive.tsx` (strips either sign), `stress/scenarioView.ts` fmtE / fmtSigned. A negative that rounds to zero prints without a sign.
- Still printing `€-x` for a negative (to be given the sign at the single owner once the formatters are collapsed): `ui/sections/tuneB/fmt.ts` (eur, eurK), `ui/sections/baseline/fmtK.ts`, `ui/sections/model-engine/shared.tsx` (fmtK), `ui/widgets/tuneA.tsx` (fmtK), `store/persistence/report/render.ts` (fmtK), `store/persistence/excel/dd/pack.ts` (kEuro), `domain/verifyB/kpi.ts` (fmtK), `domain/pdc/verifFormat.ts` (fmtK, fmtE: the verification tables compare cell by cell with the legacy), `domain/stress/compare.ts` (fmtK), `ui/sections/verifyA/agent-detail/Runs.tsx` (eur), `ui/sections/configure/board/format.ts` (EUR_M).
- Tests touched: `legacyMoney()` in `deviations.ts` maps the legacy forms ("€-15K", "-€15K", "(€15,379)") to the convention; used by `helpers/economics.ts` (`diffs`, `missingCells`, `squash`), `helpers/pdc.ts` (`sq`), `helpers/parity.ts` (`numberTokens` reads any of the four forms as the same negative number), `economics.test.ts`, `story-summary.test.tsx`; `monthly.test.tsx` asserts the new sign.
- Files: see Applied.

## DEV-PF-STRESS — the portfolio Monte Carlo and verdict (multi-product P6)

The single-product Monte Carlo, scenarios, sensitivity, strategies and decision are untouched (same seed, same draws, same verdict: `tests/domain/portfolio/stress.test.ts` replays the 100 `mcRun` fixtures through `portfolioMonteCarlo`). What differs for a portfolio, and why:

- **Per-product seed.** `seed XOR djb2(productId)` (`stressSeed.ts#productSeed`), but the seed itself when the run has a single planned product, so a one-product portfolio draws exactly what `runMonteCarlo` draws. The seed of a product therefore changes when a second product is planned (its stand-alone law does not).
- **Outcome of a draw.** The decision layer's metric is the horizon-aware **net benefit** (`mcOutcome`: Σ savings − setup, undiscounted, over the product's own horizon). In the portfolio run, each draw of each product is placed on the calendar (wave start + product offset) and **cut at the portfolio horizon exactly as the deterministic consolidation cuts it** (`stressCut.ts#cutNet`: the product's months past `portfolioHorizon` are dropped, and with a KT lead the KT part of the setup is booked on its preparation months, so it counts when they fall inside the horizon and the home months do not); the portfolio outcome is the **sum of the products' cut net benefits of the draw**, and a wave's outcome the same sum over its products. A product starting at month 48 of a 60-month portfolio contributes its first 12 months. A product that fits inside the horizon keeps `mcOutcome` (the same undiscounted sum: no truncation means no change, and the single-product run is bit for bit today's). Invariant (`tests/domain/portfolio/stressCut.test.ts`): with zero spreads every draw equals the deterministic consolidated net (portfolio, waves and products). A product's stand-alone stats in the run are therefore those of its months inside the horizon, which differ from its own Monte Carlo when it is cut. The deterministic net / ROI / payback shown next to the verdict stay the consolidated ones.
- **Correlation.** Gaussian copula with one global ρ ∈ [0, 1] (D-M7, default 0): per draw and per uncertain driver, `g = sqrt(ρ)·Z + sqrt(1−ρ)·ε` (Z shared by all products, ε the product's own stream), mapped by Φ and the inverse CDF of the same triangular marginal (`mcSampleT`). Marginals are unchanged for any ρ. ρ = 0 does **not** use the copula: it is the legacy stream, bit for bit. Drivers stay independent of each other inside a product (as today). A lone product is not affected by ρ in law (its draws are reshuffled, not rescaled).
- **Risk reduction ("diversification").** Reported as `portfolio P10 − Σ standalone P10` (>= 0 when diversified, 0 at ρ = 1). This is the "sum of standalone P10 minus portfolio P10" asked for in the downside-magnitude sense (Σ(−P10) − (−P10 of the portfolio)); the sign is chosen so that a bigger number means more protection.
- **Verdict rule.** `verdictRule` (extracted from `decide`, same thresholds `DI_THRESHOLDS`, same coherence invariant) applies unchanged to the portfolio / wave distribution. Only its inputs are extended: **setup** = Σ of the products' `setupTotal` (the floor is −50 % of it); **risk-bar premium** = the product premiums (engagement context + wave-2 modules, `riskPremiumOf`) **averaged with the entry headcount (base ETP) as weight** (simple mean if the weights are all 0) — a large product's context weighs more than a small one's, and a portfolio mixing a regulated and a plain product gets an intermediate bar; **conditions** name the products whose draws correlate most with the group outcome (|r| >= 0.2) instead of single-case input drivers (a product-level input has no meaning across products). No other rule differs.
- **Scenarios**: the product view is untouched (active product). With the Portfolio or a Wave in view, the Scenarios section also shows the **portfolio scenarios table** (lot 7, `domain/portfolio/aggScenarios.ts#portfolioScenarios`): each product's six scenario engines (`domain/stress/scenarios.ts#scenarioEngine`, the very engine `scenarioModel` reads, memoised per product run) are laid on the calendar by the consolidation kernel (`productSeries`: month 0, KT lead, truncation at the portfolio horizon; a scenario without setup has no KT setup either) and summed by `aggregate` / `summarize` (F16), so there is no second set of headline owners: NPV at the common rate from portfolio month 1, ROI `roiCanonical`, payback = first calendar month with cumulative cash >= 0 (shown "immediate" when there is no setup and the scenario saves, as `paybackShown`). With one product starting at month 0 the table is the product's scenarios; "AI + Location" is the deterministic consolidation. A scenario's label falls back to a generic one when the products' destinations or ramp rates differ. **Sensitivity** stays per product.
- **Speed.** `splineEval` caches the Fritsch-Carlson slopes per control-point list and `withInputs` parses its overrides once: same arithmetic, bit-identical numbers (all oracles green), 20 products × 1,000 draws ≈ 1.4 s instead of 2.2 s.
- **Histogram per scope.** The Monte Carlo aggregate view draws the histogram for a Portfolio and for a Wave (the wave's draws: its products added draw by draw, kept in `WaveStress.outcomes`), with the same `ChartPanel` (chart error boundary, theme applied in place by `chart.update('none')`) as Portfolio stress.
- Files: `domain/portfolio/{stress,stressCut,stressSeed,stressFingerprint,stressTypes,stressVerdict}.ts`, `domain/stress/{simulate,rng}.ts` (`mcDraws`, `mcStats`, `mcSampleT`), `domain/verdict/decision.ts` (`verdictRule`, `riskPremiumOf`).

## DEV-ARCH-CONTENT — the architecture sections describe the TypeScript build

Requested change (v20.2). The sections `arch-layers` (🏛️ Architecture — Layers) and `arch-content` (🏛️ Architecture — Layers content) used to reproduce the legacy page: five layers, six engines (BUS, APP_STATE, PM, DEP, AUDIT, TIME), wiring status, migration plan and code references into the single file. Their content is rewritten for the product as it is now: the four code layers (ui, controllers, store, domain) and the ESLint rules, the Time Engine, the command bus, the Portfolio layer, persistence and file formats, the View selector and aggregated view, security, performance budgets, the proof layer, the registries, the known gaps (from docs/ARCHITECTURE.md §12) and a legacy-to-today table. Styles, titles, section ids and kinds (`S-static`, independent of the View) are unchanged; the `NewBuildNote` callout (and `content/refshare/newbuild.json`) shown above them is removed because the content now says it.

- Legacy: the sections' visible text was compared with the legacy text (`expectParity('arch-layers' | 'arch-content', ...)`: every figure and heading of the legacy page had to appear).
- New build: the legacy page is no longer the oracle for these two sections, since describing the legacy architecture is exactly what is out of date.
- Tests replaced: in `tests/ui/sections/arch.test.tsx`, the two `expectParity` assertions and the assertion that the new-build mapping heading is shown. Added: `tests/ui/sections/arch.test.tsx` (renders without console error, one h1, heading order, no legacy status vocabulary, navigation) and `tests/ui/arch-facts.test.ts` (section / group / command / variable / key / coefficient / fixture counts equal the code, limits equal the constants, every path in a code element exists, every `go` target is a catalogue id, no hard-coded version). The English-only guard applies unchanged.
- UI parity: `tools/ui-parity.mjs` compares computed styles per element kind, not text; styles are unchanged, so no exception is recorded.
- Catalogue descriptions: the `description` of the two sections in `ui/zones/data/sectionCatalog.json` is updated to match. The parameters workbook exports it in the `Sections` sheet, so `tests/store/excel-params-writer.test.ts` exempts exactly those two legacy description cells (and nothing else) from the legacy comparison.

## DEV-DEPS-ZONES — the Section Dependencies page shows the graph generated from the code

Requested change (unreleased). The section `deps` (🔗 Section Dependencies) used to display and edit an authored registry: `SECTION_DEPS` (148 edges between 30 of the sections, strong or soft) and `SECTION_DEPS_DESC`, stored in the case, as a graph, a matrix, a description table, a build order and an edge editor. It now shows a graph **generated from the code** (`npm run deps:gen` writes `app/src/generated/dependencies.json`): calculation zones (the `@calc-zone` tags), the sections, the edges found in the imports, the figures with one owner each, the tests that reach each zone, and the rule that selects tests from it ([TEST_SELECTION.md](TEST_SELECTION.md)).

- Legacy: authored edges, edited by hand, "documents the DEP graph for humans; does not drive it".
- New build: generated edges, never edited; the page and the selection of tests cannot disagree with the code (a test fails when the file is stale).
- Compatibility, unchanged: `SECTION_DEPS` and `SECTION_DEPS_DESC` stay in the case and in the parameters workbook exactly as before (sheet `Deps`, `tests/store/excel-params-*` untouched), the five `deps.*` commands stay registered, the logic-verification checks that read the registry (`CC-DEP-*`) still run. Only the screen no longer shows or edits them; the page says so.
- Tests replaced in `tests/ui/sections/deps.test.tsx`: the legacy-text parity (`expectParity('deps', ...)`: "148 edges", "30 of 85 sections drive something", the lane names), the hover test, the matrix / descriptions / build-order tests over the authored data and the three edge-editor tests (add, flip, remove, describe, undo, prune a ghost edge). Added: tests of the generated content (tabs, one node per zone and calculating section, selection and impact, keyboard, section links, matrix, zones and figures, build order, tests tab) and a test that the authored registry is untouched and its commands registered. Reason: the displayed content is intentionally different, by request.
- UI parity: `tools/ui-parity.mjs` compares computed styles per element kind, not text; the page uses the shared widgets, so no exception is recorded.
- Files: `ui/sections/refshare/deps/*`, `content/refshare/deps*.json`, `domain/zones/*`, `generated/dependencies.json`, `scripts/{gen-deps,affected-tests,validate-affected}.ts`, `scripts/lib/*`.

## DEV-MENU-STRUCTURES — several menu structures, one per persona

Requested change (unreleased). The legacy file has ONE global menu structure: `GROUPS` (order, label, colour, description) and, per section, a group and a group order (`sectionGroups`), shared by every persona. The new build lets several named **menu structures** coexist so a new way of grouping the menu never touches the existing one.

- The legacy structure is the built-in **Standard** structure, stored exactly where the legacy stores it (`GROUPS`, `GROUP_COLORS`, `sectionGroups`). Any other structure is stored in `MENU_STRUCTURES` (its own groups, colours and the group + order of every section) or shipped with the app (**Business journey**, copied into the case on its first edit). A persona navigates with `menuStructure` (absent = Standard). Older files have neither key: they load, display and save exactly as before; every existing persona keeps the standard structure.
- Persona management: a **Menu structure** bar on 🗂️ Menu groups, 📄 Sections and 🗺️ Menu layout (pick, duplicate, rename, delete when no persona uses it; Standard and the shipped structures cannot be deleted, Standard cannot be renamed); those tabs edit the picked structure only. The persona's structure is picked in 🧩 Section assignment. The guided-sequence editor, its section picker and "Generate from groups", and 🧩 Persona layout use the persona's structure. Per-persona order overrides are unchanged.
- 🧩 Section assignment now has the legacy layout: one persona picker, then the pill sub-tabs "🧩 Section assignment" (Assigned / Available) and "🧭 Guided sequence (wizard)". The top-level 🧭 Guided sequence tab is kept (same editor with its own picker). The legacy 📄 Sections tab ("Sections (group & order)": group, Group Seq, tag, MVP, description, personas using it, ↔ Respace ×10 Group Seq, detail card) is restored; tag and MVP are editable again and remain properties of the section, shared by all structures. Its live preview is the persona's menu as the structure lays it out, with the section marked, plus a link that opens the section — not the legacy iframe copy of the whole page.
- New built-in persona **Business journey** (`business-journey`, compact nav, not the default — Builder stays default) on the Business journey structure: six stages (1 · Frame, 2 · Today, 3 · Choose the scope, 4 · Size the system, 5 · Read the result, 6 · Defend & present), Portfolio and Reference; it sees every section (the Portfolio ones from two products on, like every persona), its guided sequence walks the core sections of each stage (28 stops, plus a Portfolio step of 5 shown only from two products on). It is in the default case; an older case shows "➕ Add the built-in persona Business journey" on 👥 Personas. Deviation from the brief: Gantt / Timeline sits in 5 · Read the result (go deeper), not in Portfolio, so a single case does not show a Portfolio group holding one section; Operating model sits in 5 · Read the result because it is the only late section that shows the run-team figure.
- Guided walk: with one product the Portfolio sections of a sequence are not walked (no existing sequence holds any, so existing walks are unchanged).
- Parameters workbook: sheets "Menu Structures" and "Menu Structure Sections", written only when the case stores a structure (created, or a built-in once edited; an unedited built-in comes with the app), and a "Menu structure" column on Personas, written only when a persona uses another structure than Standard. A case on Standard only exports the legacy workbook unchanged; older workbooks import as before (the case keeps its structures and each persona its structure).
- Test changed on purpose: `tests/helpers/excelParams.ts` `freshDoc()` (the document the legacy imports are replayed against) drops the shipped Business journey persona, which the legacy pristine state never had (a legacy "Persona Sections" sheet replaces every menu, so the persona would otherwise show up as a touched key).
- Files: `domain/nav/structures.ts`, `domain/nav/businessJourney.json`, `controllers/menuStructures.ts`, `controllers/menuTarget.ts`, `controllers/{pdcPersonas,navLayout}.ts`, `ui/zones/navModel.ts`, `ui/sections/configure/personas/*`, `store/persistence/excel/params/sheets/{menuStructures,personas}.ts`.

## DEV-BRAND-THEME — theme library, Brand & theme screen, customer logo

Requested change (unreleased, T4 + T5 of the configurable theme). The legacy file has one look. The new build stores a **theme library** in the case
(`THEMES`, `ACTIVE_THEME`, `THEME_SEQ`) and a **customer logo** (`CUSTOMER_LOGO`); none of these keys exists in a default case, so older files and the
default case load, display and save exactly as before (the default theme writes nothing on the page: ui-parity unchanged). Details: docs/THEME.md §8.

- New section **🎨 Brand & theme** (CONFIGURE, groupSeq 30; Business journey: Reference). It has no legacy equivalent, so it is an **app section**
  (`"app": true` in `ui/zones/data/sectionCatalog.json`): like the Portfolio sections it is not in `LEGACY_SECTIONS`, hence not on the "Sections"
  sheet of the parameters workbook and not in the case's `PERSONA_SECTIONS` (the default case is unchanged); the navigation adds it to the personas
  its `personas` field names (Admin, Builder, Business journey; Advanced sees every section). It cannot be removed from those personas in Persona
  management in this version. Tests that compare the navigation with the legacy page leave app sections out (`tests/domain/nav.test.ts`,
  `tests/ui/nav.test.tsx`); the catalogue counts are 86 sections (79 + 6 Portfolio + 1 app section), 19 `S-static`.
- Parameters workbook: sheet **Themes**, written only when the case has a user theme or another active theme than 1; the logo is not carried.
- Engagement context: a "Customer logo" card (upload, backdrop, hide, remove). The header shows the logo next to "AgentCase for <customer>" only when
  one is set; the HTML report shows it above the title only when one is set (otherwise byte-identical).
- `?theme=<n>` in the address shows a theme without changing the case (a notice offers to adopt or clear it).
- Files: `domain/theme/{themeDef,derive,themedDisplay,catalogue,library,themeFile,themeProps,themeChecks,active,logo}.ts`, `controllers/{themes,brand}.ts`,
  `ui/brand/*`, `ui/sections/configure/brand-theme/*`, `ui/sections/frame/engagement-context/LogoPanel.tsx`, `store/persistence/excel/params/sheets/themes.ts`,
  `store/persistence/excel/results/logo.ts`, `store/persistence/report/{data,render}.ts`.

## DEV-HEADER-MENU — the header and the top bar differ from the legacy chrome

Product decisions (user requests, v20.1.0 → v20.12.0). The legacy header is a tall banner: title "AgentCase vX.Y", a subtitle line, the Capgemini
wordmark, and the right-side controls (persona, Fast Path, Save / Open, Undo / Redo) in one wrapping group; the group bar of the hide-menu mode
carries its own ☰ Menu button and persona picker. The new build:

- **Title and subtitle** (v20.1.0): the title reads "AgentCase [for <customer>] vX.Y" (the customer name is edited in Engagement context); the subtitle
  line "Agentic Transformation: From Team Baseline to Confidence-Conditional Verdict" is removed.
- **Compact header** (v20.4.0): the blank band left by the subtitle is removed (padding 12px, title margin 0).
- **Two zones** (v20.12.0): left = title (and the customer logo, DEV-BRAND-THEME), ☰ sidebar toggle, Persona and Fast Path; right = Show / Change (several
  products only), undo / redo, 📁 file menu, ◐ display menu.
- **File menu** (v20.12.0): Save and Open… move into a menu opened by an icon-only 📁 button (WAI-ARIA menu button: arrows, Home / End, Escape, click
  outside). Undo / Redo are icon-only (↶ ↷, v20.11.0); their accessible names and tooltips are unchanged.
- **Show / Change** (v20.12.0, replacing View and Edit: of v20.1.0 / v20.11.0): multi-product selectors with no legacy equivalent, absent with a
  single product (spec F23), so a single case shows the legacy set of controls.
- **Group bar without ☰ / persona** (v20.11.0): in the hide-menu mode the group bar no longer repeats the ☰ Menu button and the persona picker (they
  duplicated the top bar's ☰ toggle and Persona picker).
- Unchanged: every keyboard shortcut, the persona list, Fast Path, the session chip, the KPI bar position (its content: DEV-KPI-BAR).
- UI parity: the measured differences are recorded, with their reason, in `app/ui-parity-exceptions.json` (`header` box height and paddings,
  `header:title` width and margin; see DEV-UI-PARITY); `tools/ui-parity.mjs` fails on any other header divergence and on drift inside an exception.
- Files: `ui/shell/{TopZone,ProductBar,ScopeSelect,EditSelect,FileMenu,GroupNavBar}.tsx`, `ui/theme/*.css`.

## DEV-KPI-BAR — the KPI bar shows FTE, saving over the horizon and velocity; NPV moved out

Requested change (v20.1.0). The legacy KPI bar shows Y3 savings, run cost, setup, NPV and payback. The new bar adds **FTE before / FTE after**,
**Saving over N yr** (net cost reduction over the horizon) and **Velocity Yn**, with a tooltip on every value; **NPV is no longer on the bar** (it stays in
Results and Financial, same owner, DEV-HEADLINE-OWNER). With several products a **Scope** tile names what the figures cover (`ui/shell/ScopeKpis.tsx`).

- Figures are unchanged (same owners, `tests/domain/figure-owners.test.ts`); only the selection shown on the bar differs.
- Files: `ui/shell/{KpiZone,Kpi,ScopeKpis}.tsx`.

## DEV-UI-PARITY — the recorded ui-parity exceptions

`app/ui-parity-exceptions.json` is the machine-readable register of the computed-style differences from the legacy page that are deliberate; each entry pins
the NEW value (`expected`) and gives the reason, and `tools/ui-parity.mjs` (`npm run ui-parity`) fails on any unrecorded difference and on drift inside an
exception. Two kinds of entries, both cross-referenced here so that this file stays the one list of deviations:

- **Accessibility corrections** (accessibility pass, v19): `kpibar:label` opacity 0.7 → 0.73 (4.51:1); the form focus ring `sections:form:input:focus`
  (2px solid `#0058AB`, 7.04:1, the legacy glow kept); the formula band spans `sections:help:formula:span-a|b|g` lightened in the same hue to reach 4.5:1.
- **Product decisions**: the header entries of DEV-HEADER-MENU (`header` height and paddings, `header:title` width and margin).

A new deliberate visual difference is added to the JSON file AND described here (or in the entry of the feature that causes it).

## DEV-COSTMODEL-PILOT — the pilot cost is included in the totals of the cost-model workbook

Changed in lot 4 (user decision D4). The Cost model (monthly) workbook (`domain/portfolio/costModel*.ts`) now carries the pilot of 🧭 Program & Completeness
(`tune/program` `pilotSizing`: team, duration = prove weeks + 2 weeks per break-in sprint, cost) as a **dated cost line** of each product,
"**Pilot (included in totals)**" (group *Pilot* on **Other costs**): `pilotMonths` spreads the cost evenly over its weeks from the product's month 1
(a month = 52 / 12 weeks, the last month pro rata; e.g. 3 FTE, 12 + 2 x 2 weeks = 16 weeks = 3.69 months: three full months and 69 % of a fourth).

- **Totals**: the product TOTAL TO-BE COST (days x rate + other costs + pilot), the WAVE and PORTFOLIO totals ("... TOTAL TO-BE COST (pilot included)") are
  the sums of their rows, the pilot included (live Excel SUM formulas).
- **Reconciliation with the app**: the app's own headline (setup, run cost, net, ROI, payback, NPV) does **not** count the pilot (nor does the legacy file);
  it is unchanged. So the check row is "Engine total + pilot" (AS-IS cost less net savings, plus the pilot months) and the "Difference (must be 0)" rows stay
  0; over the horizon, AS-IS cost - TOTAL TO-BE COST = the app net benefit - the pilot. The note of the Other costs sheet says so, and **Parameters** lists
  "Pilot cost (included in the cost-model totals, not in the engine cost)".
- Before (v20.2.0 to v20.13.0): a memo line "Pilot (indicative sizing, not in the engine cost)" with the amount and no months, outside the totals.
- Legacy: no cost-model workbook; the pilot is an indicative figure of the Program section only.
- A pilot longer than the calendar is cut at the horizon like every other line.
- Files: `domain/tune/program.ts` (`pilotMonths`), `domain/portfolio/{costModelLines,costModelOther,costModelParams}.ts`, `store/persistence/excel/costmodel/index.ts`;
  tests `tests/domain/portfolio/costModel.test.ts` (pilot months = the sizing, totals = sum of the rows including the pilot, reconciliation with the app net on
  four fixtures, the 107 fixtures and the multi-product portfolios), `tests/store/excel-costmodel.test.ts`.

## DEV-APP-SECTION-PERSONAS — Brand & theme cannot be removed from the personas that show it

Current state (v20.9.0). 🎨 Brand & theme is an *app section* (DEV-BRAND-THEME): it is not in the case's `PERSONA_SECTIONS` (so the default case and the
parameters workbook stay legacy-shaped), and the navigation adds it to the personas its catalogue entry names (Admin, Builder, Business journey; Advanced
sees every section). Consequence: **Persona management cannot remove it** from those personas (the Section assignment tab lists it as assigned but the
removal has no effect on an app section), unlike any legacy section.

- Legacy: no such section; every section is assignable.
- **Planned change (lot 7)**: app sections become assignable like the others (stored without breaking the legacy shape of `PERSONA_SECTIONS`).
- Files: `ui/zones/registry.ts` (`APP_SECTIONS`), `ui/zones/navModel.ts`, `ui/zones/data/sectionCatalog.json`.

## DEV-THEME-SEQ-UNDO — known defect: a theme sequence id can be issued twice after an undo

Known defect, not an intended behaviour (recorded so that it is not mistaken for one). `THEME_SEQ` (the last theme id issued, docs/THEME.md §8.4) is a
key of the document, so **undoing** the creation of a theme also rolls `THEME_SEQ` back; the next theme created then receives the **same** `seq`. A
`?theme=<seq>` link copied before the undo now opens a different theme, which breaks the rule "a sequence id is never reused".

- Legacy: no theme library.
- **Fix planned (lot 3)**: keep the high-water mark outside the undoable state (or make it monotonic across undo / redo) and add a regression test.
- Files: `controllers/themes.ts` (`append`, `lastIssuedSeq`), `domain/theme/library.ts`.

## DEV-PF-GAPS — portfolio features not built (left out on purpose or not yet)

The multi-product build has no legacy counterpart; these are the gaps against the specification and the user's expectations, recorded so that a
missing feature is not read as a bug. The authoritative list of known gaps is docs/ARCHITECTURE.md §12 and docs/MIGRATION_PLAN.md §15.

| Gap | State | Where it is discussed |
|---|---|---|
| **Shared teams** across products (a person on two products) | not built: each product has its own entry team | SPEC_MULTI_PRODUIT.md §9 |

Built since (removed from the table above):

- **Dependencies between waves and transformation-team capacity (lot 7, SPEC_MULTI_PRODUIT.md F13).** A wave may start after another wave
  `start`s or after its last product finishes setup (`setupEnd`), plus a lag in months; its effective start is `max(own start, derived start)`.
  An optional portfolio parameter `maxConcurrentSetups` caps the products whose own setup months overlap; the later ones (wave order, a wave after
  the one it depends on, then board order) are pushed back. One owner: `domain/portfolio/waveSchedule.ts#resolveSchedule` (pure, acyclic: a cycle
  is refused by the command and, from a file, flagged and ignored), read by `scheduledProducts`, so the consolidation, Gantt (dependency marker),
  KPI bar, stress, results workbook and report use the effective starts. Commands `wave.setDependency`, `portfolio.setMaxConcurrentSetups`
  (undoable); Waves section: a "Dependency" group per wave, the capacity field, a "Schedule" checks panel (codes `wave-delayed`, `setup-pushed`,
  `wave-dep-cycle`, `wave-dep-unknown`, also in the Consolidation diagnostics). Both fields are optional: absent = the v1 calendar (every existing
  portfolio test unchanged); no schema bump. The parameters workbook carries them (Waves columns F-H, PortfolioSettings row "Max products in setup
  at once"). Tests: `tests/domain/portfolio/waveSchedule.test.ts`, `tests/store/portfolio-wave-deps.test.ts`, `tests/ui/portfolio-wave-deps.test.tsx`.

## DEV-SNAPSHOT-RESTORE — opening the 107 case files: the legacy restore against the new build

`tools/parallel-run.mjs` opens files in the legacy file (`applySnapshotState`) and in the built app (File > Open…) and compares six figures. On the 107 case
files (`app/fixtures/cases/*.json`), 104 agreed and 3 differed until lot 4 (`node ../tools/parallel-run.mjs fixtures/cases/*.json` from `app/`). The oracle
tests are not concerned: they drive the legacy *engine* through recipes, and the new engine equals them on all 107. Each difference, field by field:

| Case | Fields of the case file that differ from `golden` | Legacy restore | New build | Who is right |
|---|---|---|---|---|
| `lifecycle-pos-0` | `lifecyclePos` 25 → 0, `dom.values.lcScopeSelect` / `lcScopePos` 25 → 0, `glassCeiling` 25 → 26 | re-fits the potential (`applyScopeAuto`): the scope at position 0 gives **74 %** (stored: 75 %); effective 62.9 % → 63 %, savings €788k, run €989k, NPV €1,212k | before lot 4, File > Open… (`controllers/files.ts`) did **not** re-fit (the snapshot panel did): 75 %, effective 63.75 % → 64 %, savings €796k, run €982k, NPV €1,222k | the legacy: **fixed** — every open path now goes through `openParsed` (re-fit). Now identical |
| `curve-bass` | `scurve.family` spline → **bass**, `scurve.curve` → `bass.default` | the `scurve` setter of `STATE_REGISTRY` accepts only `logistic`, `gompertz`, `spline` (`if(v.family==='logistic' \|\| v.family==='gompertz' \|\| v.family==='spline')`): the bass family is dropped, the case reopens on the default spline = the golden figures (€892k / €886k / NPV €1,359k / 9 mo) | the bass curve is kept: €902k / €876k / NPV €1,339k / 10 mo = the oracle figures of the fixture | the new build (a legacy restore defect, MIGRATION_PLAN §15.4: "`bass` curve family not restored"); not restorable without changing the frozen legacy file |
| `curve-legacy` | `scurve.family` → **legacy**, `scurve.curve` → `legacy.flatAnnual` | same setter: `legacy` is dropped too, golden figures | the legacy flat-annual curve is kept: €1,064k / €713k / NPV €1,700k / payback 1 mo = the oracle figures | the new build (same defect) |

- After lot 4: **105 of 107 identical**, the 2 remaining differences are the two legacy defects above (they are not computed differently: the legacy simply
  reopens another curve). The 40 parameters workbooks stay 40 / 40 identical.
- Pinned in CI (lot 6): the nightly workflow runs `node tools/parallel-run.mjs --corpus full` (40 workbooks + 107 case files). The two differences are
  recorded line for line in `tools/parallel-run-known.json` and reported as `KNOWN`; any other difference fails, and so does a change of either recorded line
  (a fix on one side, or another figure moving): update the file and this section together.
- Evidence of the legacy figures: measured in the legacy file with Playwright (`applySnapshotState(case)`, then `model()`, `npvCanonical()`,
  `paybackMonthsCanonical()`): lifecycle-pos-0 gives potential 74, effective 62.9, NPV 1,212,009.6152358602, payback 9.
- Tests: `tests/store/snapshot-restore-parity.test.ts` (File > Open… = snapshot panel on all 107 files; lifecycle-pos-0 re-fitted to 74 % with the legacy
  restore figures, the stored case keeps the oracle figures; curve-bass / curve-legacy keep their family and the oracle figures, and the legacy setter
  line is asserted verbatim in the legacy file, so a change on either side fails the test).
