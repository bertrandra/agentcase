import { resetStrategies } from '@/controllers/stress';
import { STRATEGY_DEFS_DEFAULT, strategyDefsOf } from '@/domain/verdict';
import { useCtx } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { SectionFrame } from '@/ui/zones/SectionFrame';
import { Comparison } from './Comparison';
import { EditorRow } from './EditorRow';

const help = (
  <p>Seven delivery strategies (T&amp;M · Skill center · Service center · Hybrid · Agentic Organization · Offshore · Nearshore) evaluated on the same calculation core and the same invariants —
    current product status &amp; posture, phase/artefact scope, team, rate card, tokens and horizon. Only the transformation levers differ. The comparison answers: for THIS product, THIS scope,
    THIS status — which delivery strategy?</p>
);
const HEAD = ['Strategy', 'Auto %', 'Y1', 'Y2', 'Y3', 'Ceiling %', 'Setup ×', 'Run ×', 'Risk', 'Agility', 'TO-BE geo split'];

/** Strategy comparison — 7 delivery strategies: metrics, location split, weighted ranking and the strategy configuration. */
export default function StrategiesSection() {
  const c = useCtx(), defs = strategyDefsOf(c.s);
  return (
    <SectionFrame title="🏆 Strategy comparison — 7 delivery strategies" help={help}
      input={<Panel title="Strategy configuration" aside={<button type="button" onClick={resetStrategies}>↺ Reset all strategies</button>}>
        <p className="ac-muted">Empty = inherit the current simulation value. Amber = edited vs default. Geo split rows must total 100%.</p>
        <div className="ac-table-wrap" tabIndex={0}><table className="ac-table"><thead><tr>{HEAD.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{defs.map((S) => <EditorRow key={S.id} S={S} D={STRATEGY_DEFS_DEFAULT.find((x) => x.id === S.id)} />)}</tbody></table></div>
      </Panel>}
      result={<Comparison />} />
  );
}
