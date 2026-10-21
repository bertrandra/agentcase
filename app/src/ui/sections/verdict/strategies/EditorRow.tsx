import { LOCATIONS } from '@/domain';
import { setStratDeclared, setStratLever, setStratSplit, setStratSplitMode } from '@/controllers/stress';
import type { LeverKey, StrategyDef } from '@/domain/verdict';

const LEVERS: { key: LeverKey; step: number; ph: string; tip?: string }[] = [
  { key: 'auto', step: 1, ph: 'current', tip: 'Automation potential (empty = inherit current)' }, { key: 'y1', step: 1, ph: 'cur' }, { key: 'y2', step: 1, ph: 'cur' }, { key: 'y3', step: 1, ph: 'cur' },
  { key: 'ceiling', step: 1, ph: 'current', tip: 'Glass ceiling — active as soon as the strategy is agentic (auto > 0)' }, { key: 'setupF', step: 0.1, ph: '1' }, { key: 'runF', step: 0.1, ph: '1' },
];
const modeOf = (s: StrategyDef) => (s.locSplit == null ? 'inherit' : s.locSplit === 'ASIS' ? 'asis' : 'custom');
const edit = (on: boolean) => ({ borderColor: on ? 'var(--ac-amber)' : undefined });

/** One strategy: levers (empty = inherit), declared risk/agility, location-split mode and, when custom, the geo split that must total 100 %. */
export function EditorRow({ S, D }: { S: StrategyDef; D: StrategyDef | undefined }) {
  const mode = modeOf(S), split = typeof S.locSplit === 'object' && S.locSplit ? S.locSplit : null;
  const tot = split ? LOCATIONS.reduce((a, l) => a + (split[l.name] || 0), 0) : 0;
  return (
    <>
      <tr>
        <td style={{ whiteSpace: 'nowrap' }}>{S.icon} <strong>{S.label}</strong></td>
        {LEVERS.map((l) => (
          <td key={l.key} className="ac-c"><input type="number" step={l.step} aria-label={`${l.key} of ${S.label}`} title={l.tip} placeholder={l.ph} value={S.levers[l.key] ?? ''}
            onChange={(e) => setStratLever(S.id, l.key, e.target.value)} style={{ width: 58, textAlign: 'center', ...edit(JSON.stringify(S.levers[l.key]) !== JSON.stringify(D?.levers[l.key])) }} /></td>
        ))}
        {(['risk', 'agility'] as const).map((k) => (
          <td key={k} className="ac-c"><select aria-label={`${k} of ${S.label}`} value={S.declared[k]} onChange={(e) => setStratDeclared(S.id, k, e.target.value)} style={edit(S.declared[k] !== D?.declared[k])}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></td>
        ))}
        <td><select aria-label={`Location split of ${S.label}`} value={mode} onChange={(e) => setStratSplitMode(S.id, e.target.value as 'inherit' | 'asis' | 'custom')} style={edit(D ? mode !== modeOf(D) : false)}>
          <option value="inherit">Inherit current</option><option value="asis">AS-IS mix</option><option value="custom">Custom split</option></select></td>
      </tr>
      {split && (
        <tr style={{ background: '#fbfcfe' }}><td className="ac-muted">↳ Geo split (%)</td>
          <td colSpan={10}><div className="ac-form-row">
            {LOCATIONS.map((l) => (
              <label key={l.name} className="ac-check">{l.name} <input type="number" min={0} max={100} step={5} aria-label={`${l.name} share of ${S.label}`} value={split[l.name] || 0}
                onChange={(e) => setStratSplit(S.id, l.name, e.target.value)} style={{ width: 52, textAlign: 'center' }} /></label>))}
            <strong style={{ color: Math.abs(tot - 100) < 0.5 ? 'var(--ac-teal)' : 'var(--ac-brick)' }}>Σ {Math.round(tot * 10) / 10}%</strong>
          </div></td></tr>
      )}
    </>
  );
}
