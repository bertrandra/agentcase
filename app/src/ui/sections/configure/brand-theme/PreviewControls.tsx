import { useState } from 'react';
import { Field } from '@/ui/widgets/field/Field';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';
import { FieldToggle } from '@/ui/widgets/field/FieldToggle';

const OPTS = [{ value: 'msc', label: 'MSC' }, { value: 'msi', label: 'MSI' }, { value: 'sta', label: 'STA' }];
const BARS = [62, 48, 75, 40, 55, 68, 35, 50];
const FILLS = ['var(--ac-chart-cat-1)', 'var(--ac-chart-cat-2)', 'var(--ac-chart-cat-3)', 'var(--ac-chart-cat-4)', 'var(--ac-chart-cat-5)',
  'var(--ac-chart-cat-6)', 'var(--ac-chart-cat-7)', 'var(--ac-chart-cat-8)'];

/** One control of each kind, rendered with the previewed theme's control variants (ThemeAxesContext). Preview values only: nothing reaches the case. */
export function PreviewControls() {
  const [n, setN] = useState('40'), [c, setC] = useState('msi'), [on, setOn] = useState(true);
  return (
    <div className="ac-bt-pv-controls">
      <FieldNumber native="slider" label="Adoption (preview)" value={n} min={0} max={100} step={5} unit="%" onCommit={setN}>
        <Field label={`Adoption (preview): ${n}%`}><input type="range" value={n} min={0} max={100} step={5} onChange={(e) => setN(e.target.value)} /></Field>
      </FieldNumber>
      <FieldChoice label="Context (preview)" value={c} options={OPTS} onChange={setC}>
        <Field label="Context (preview)"><select value={c} onChange={(e) => setC(e.target.value)}>
          {OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
      </FieldChoice>
      <FieldToggle label="Include regulatory artefacts (preview)" checked={on} onChange={setOn}>
        <label className="ac-check"><input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} /> Include regulatory artefacts
          (preview)</label>
      </FieldToggle>
      <Field label="Customer (preview)"><input type="text" defaultValue="Acme Corp" /></Field>
      <div className="ac-bt-actions"><button type="button" data-tone="primary">Primary action</button>
        <button type="button" className="ac-btn">Secondary</button></div>
    </div>
  );
}

/** The categorical series as an SVG bar chart (CSS variables: it follows the preview container, no canvas to rebuild). */
export function PreviewChart() {
  return (
    <svg className="ac-bt-pv-chart" viewBox="0 0 168 80" role="img" aria-label="Chart series 1 to 8">
      <line x1="4" y1="76" x2="164" y2="76" stroke="var(--ac-chart-axis)" strokeWidth="1" />
      {BARS.map((h, i) => <rect key={i} x={8 + i * 20} y={76 - h} width="14" height={h} rx="2" fill={FILLS[i]} />)}
    </svg>
  );
}
