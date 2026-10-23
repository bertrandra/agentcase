import { useState } from 'react';
import { setAutoCap } from '@/controllers/scopeTools';
import { useDoc } from '@/store/hooks';
import { CheckInput, RangeInput } from '@/ui/widgets/fields';
import { FieldNumber } from '@/ui/widgets/field/FieldNumber';

/** Technical cap: committed on blur / Enter (like the legacy onchange), so typing "6" on the way to "60" is not clamped to 10 mid-way. */
function CapInput() {
  const cap = useDoc((d) => d.dom.values.autoCapPct ?? '100'), [draft, setDraft] = useState<string | null>(null);
  const commit = () => { if (draft != null) setAutoCap(parseFloat(draft)); setDraft(null); };
  return (
    <FieldNumber native="number" label="⚙️ Technical automation cap" unit="%" value={cap} min={10} max={100} step={5} onCommit={(v) => setAutoCap(parseFloat(v))}
      hint="The most a full delivery scope can be agent-automated, before the glass ceiling. Default 100% (no technical cap).">
    <div className="ac-cap-row">
      <strong>⚙️ Technical automation cap</strong>
      <input type="number" min={10} max={100} step={5} aria-label="Technical automation cap" value={draft ?? cap}
        onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); }} />
      <span className="ac-field-h">% — the most a full delivery scope can be agent-automated, <em>before</em> the glass ceiling. Bounds the slider and the scope-fit above (and the Monte-Carlo range).
        Default 100% (no technical cap); lower it to reserve an irreducible human share across the scope.</span>
    </div>
    </FieldNumber>
  );
}

/** Target automation potential: slider (locked while fitted to the scope), fit switch and technical cap. */
export function PotentialBox() {
  const cap = useDoc((d) => Math.max(10, Math.min(100, parseFloat(d.dom.values.autoCapPct ?? '') || 100)));
  return (
    <div className="ac-card">
      <div className="ac-card-t">Target automation potential (%)</div>
      <div className="ac-card-d">What agents can technically take on across the selected scope — before the glass ceiling.</div>
      <RangeInput id="autoPotential" label="Potential" max={cap} />
      <CheckInput id="fitAuto" label="🎯 Fit to selected scope" hint="when on, the slider is locked to the automatable average of the chosen artifacts; uncheck to set it manually" />
      <CapInput />
    </div>
  );
}
