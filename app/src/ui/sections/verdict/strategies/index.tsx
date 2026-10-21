import { useMemo } from 'react';
import { resetStrategies } from '@/controllers/stress';
import { evaluateStrategies, STRATEGY_DEFS_DEFAULT, stratNormalize, strategyDefsOf, strategyLocSplits, stratWeightsOf } from '@/domain/verdict';
import { useCaseResult, useCtx } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { EditorRow } from './EditorRow';
import { LocSplit } from './LocSplit';
import { MetricTable } from './MetricTable';
import { Ranking } from './Ranking';

const help = (
  <p>Seven delivery strategies (T&amp;M · Skill center · Service center · Hybrid · Agentic Organization · Offshore · Nearshore) evaluated on the same calculation core and the same invariants —
    current product status &amp; posture, phase/artefact scope, team, rate card, tokens and horizon. Only the transformation levers differ. The comparison answers: for THIS product, THIS scope,
    THIS status — which delivery strategy?</p>
);
const HEAD = ['Strategy', 'Auto %', 'Y1', 'Y2', 'Y3', 'Ceiling %', 'Setup ×', 'Run ×', 'Risk', 'Agility', 'TO-BE geo split'];

/** Strategy comparison — 7 delivery strategies: metrics, location split, weighted ranking and the strategy configuration. */
export default function StrategiesSection() {
  const c = useCtx(), horizon = useCaseResult().model.horizon, defs = strategyDefsOf(c.s), W = stratWeightsOf(c.s);
  const R = useMemo(() => evaluateStrategies(c, defs), [c, defs]);
  const N = useMemo(() => stratNormalize(R, W), [R, W]), splits = useMemo(() => strategyLocSplits(c, defs), [c, defs]);
  return (
    <SectionFrame title="🏆 Strategy comparison — 7 delivery strategies" help={help}
      input={<Panel title="Strategy configuration" aside={<button type="button" onClick={resetStrategies}>↺ Reset all strategies</button>}>
        <p className="ac-muted">Empty = inherit the current simulation value. Amber = edited vs default. Geo split rows must total 100%.</p>
        <div className="ac-table-wrap" tabIndex={0}><table className="ac-table"><thead><tr>{HEAD.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{defs.map((S) => <EditorRow key={S.id} S={S} D={STRATEGY_DEFS_DEFAULT.find((x) => x.id === S.id)} />)}</tbody></table></div>
      </Panel>}
      result={<>
        <MetricTable R={R} horizon={horizon} s={c.s} />
        <Panel title="Location split"><LocSplit rows={splits} /></Panel>
        <Panel title="Weighted ranking & profiles"><Ranking N={N} W={W} /></Panel>
      </>} />
  );
}
