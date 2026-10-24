import { useMemo, useState } from 'react';
import type { ChartConfiguration } from 'chart.js';
import { applyStrategy, resetStratWeights, runSimulation, setStratWeight } from '@/controllers/stress';
import { STRAT_WEIGHTS_DEFAULT, type MetricKey, type Ranked, type Weights } from '@/domain/verdict';
import { goSection } from '@/ui/uiState';
import { ChartPanel } from '@/ui/widgets/ChartPanel';
import { Field } from '@/ui/widgets/fields';
import { useTheme } from '@/ui/themeContext';
import type { Tok } from '@/domain/theme/resolve';
import type { TokenName } from '@/domain/theme';

const WLBL: Record<MetricKey, string> = { roi: 'ROI', tco: 'TCO', payback: 'Payback', aiCoverage: 'AI Coverage', humanSup: 'Human Supervision', risk: 'Op. Risk', agility: 'Agility' };
const MEDAL = ['🥇', '🥈', '🥉'];
const COLORS: readonly TokenName[] = ['primary-700', 'info-700', 'warning-600', 'teal-700'];

function radar(N: Ranked[], sel: string[], tok: Tok): ChartConfiguration {
  const axes = Object.keys(WLBL) as MetricKey[];
  return { type: 'radar', data: { labels: axes.map((a) => WLBL[a]), datasets: N.filter((o) => sel.includes(o.id)).slice(0, 4).map((o, i) => ({
    label: o.label, data: axes.map((a) => o.norm[a]), borderColor: tok(COLORS[i % 4]!), backgroundColor: `${tok(COLORS[i % 4]!)}22`, pointRadius: 2 })) },
  options: { scales: { r: { min: 0, max: 100, ticks: { stepSize: 25 } } }, plugins: { legend: { position: 'bottom' }, title: { display: true, text: 'Normalised strategy profiles (0-100)' } } } };
}

/** Metric weights, the weighted composite ranking (min-max normalised, direction-aware), the radar and "→ Apply". */
export function Ranking({ N, W }: { N: Ranked[]; W: Weights }) {
  const [picked, setPicked] = useState<string[] | null>(null);   // radar selection: a view choice, not part of the case
  const sel = picked ?? N.slice(0, 3).map((o) => o.id), { tok } = useTheme(), cfg = useMemo(() => radar(N, sel, tok), [N, sel, tok]);
  const apply = (id: string) => { applyStrategy(id); goSection('results'); runSimulation(); };
  return (
    <>
      <h3>Metric weights (composite score)</h3>
      <div className="ac-form-row">
        {(Object.keys(W) as MetricKey[]).map((key) => (
          <Field key={key} label={WLBL[key]}>
            <input type="number" min={0} max={100} step={5} value={W[key]} onChange={(e) => setStratWeight(key, e.target.value)} style={{ width: 60, borderColor: W[key] !== STRAT_WEIGHTS_DEFAULT[key] ? 'var(--ac-amber)' : undefined }} />
          </Field>
        ))}
        <button type="button" onClick={resetStratWeights}>↺ Reset weights</button>
      </div>
      <div className="ac-table-wrap" tabIndex={0}><table className="ac-table">
        <thead><tr><th>#</th><th>Strategy</th><th>Composite score (0-100, weighted normalised)</th><th>Score</th><th>Radar</th><th>Apply</th></tr></thead>
        <tbody>{N.map((o, i) => (
          <tr key={o.id} style={i === 0 ? { background: 'var(--ac-success-50)', fontWeight: 'var(--ac-font-weight-bold)' } : undefined}>
            <td>{MEDAL[i] ?? i + 1}</td><td>{o.icon} {o.label}</td>
            <td><span className="ac-bar" style={{ display: 'block', minWidth: 120 }}><span style={{ width: `${isNaN(o.score) ? 0 : o.score}%`, background: i === 0 ? 'var(--ac-teal)' : 'var(--ac-info-700)' }} /></span></td>
            <td className="ac-c" style={{ fontWeight: 'var(--ac-font-weight-bold)' }}>{isNaN(o.score) ? 'n/a' : o.score}</td>
            <td className="ac-c"><input type="checkbox" aria-label={`Show ${o.label} on the radar`} checked={sel.includes(o.id)} onChange={(e) => setPicked(e.target.checked ? [...sel, o.id] : sel.filter((x) => x !== o.id))} /></td>
            <td className="ac-c"><button type="button" onClick={() => apply(o.id)} title="Push these levers into the live simulation">→ Apply</button></td>
          </tr>))}</tbody>
      </table></div>
      <div style={{ maxWidth: 560, margin: '12px auto' }}><ChartPanel config={cfg} label="Normalised strategy profiles" height={300} /></div>
      <p className="ac-muted">Scores are min-max normalised across the 7 strategies per metric (direction-aware), then weighted. <strong>→ Apply</strong> pushes the strategy levers into the live simulation — the Monte Carlo
        and the verdict re-run on it automatically. Weights are consulting benchmarks; adjust to the client’s priorities.</p>
    </>
  );
}
