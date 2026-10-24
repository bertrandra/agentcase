import { ELIG_PREREQS, VERDICT_VIEW, eligVerdict } from '@/domain/tune';
import { setInput } from '@/controllers/inputs';
import { useCtx, useDoc } from '@/store/hooks';
import { Badge, Panel } from '@/ui/widgets/cards';
import { NumberInput, SelectInput } from '@/ui/widgets/fields';
import { Note } from '@/ui/widgets/tuneA';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';

const NATURES = [
  { value: 'standard', label: 'Standard (APPS-like)' }, { value: 'embedded', label: 'Embedded / firmware' },
  { value: 'critical', label: 'Critical / safety' }, { value: 'sovereign', label: 'Sovereign / air-gap' },
];

const STATUSES = [{ value: 'met', label: 'Met' }, { value: 'partial', label: 'Partial' }, { value: 'unmet', label: 'Not met' }];

function Prerequisite({ id, label, critical }: { id: string; label: string; critical: boolean }) {
  const st = useDoc((d) => d.dom.values['elPre_' + id]) || 'met';
  return (
    <tr>
      <td>{label}{critical && <small style={{ color: 'var(--ac-brick)' }}> critical</small>}</td>
      <td className="ac-c">
        <FieldChoice bare label={label} value={st} options={STATUSES} onChange={(v) => setInput('elPre_' + id, v)}>
          <select aria-label={label} value={st} onChange={(e) => setInput('elPre_' + id, e.target.value)}>
            <option value="met">Met</option><option value="partial">Partial</option><option value="unmet">Not met</option>
          </select>
        </FieldChoice>
      </td>
    </tr>
  );
}

/** EV-15 eligibility gate: delivery nature, codebase size, six prerequisites and the go / conditional / no-go verdict. */
export function GatePanel() {
  const v = eligVerdict(useCtx()), view = VERDICT_VIEW[v.verdict];
  return (
    <Panel title="Project eligibility — go / no-go" aside={<Badge tone="blue">EV-15</Badge>}>
      <div className="ac-form-row">
        <SelectInput id="elNature" label="Delivery nature" options={NATURES} />
        <NumberInput id="elLoc" label="Codebase size (kLoC)" min={0} step={50} />
      </div>
      <div className="ac-table-wrap" tabIndex={0}>
        <table className="ac-table">
          <thead><tr><th>Prerequisite (gate)</th><th>Status</th></tr></thead>
          <tbody>{ELIG_PREREQS.map((p) => <Prerequisite key={p.id} {...p} />)}</tbody>
        </table>
      </div>
      <div role="status" style={{ marginTop: 8, padding: '10px 12px', borderRadius: 'var(--ac-radius-lg)', border: `1px solid var(--ac-${view.tone})` }}>
        <strong style={{ color: `var(--ac-${view.tone})` }}>{view.text}</strong>
        {v.notes.length > 0 && <ul>{v.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
      </div>
      <Note>Reference 1.2: six prerequisites + red-flag legacy screening. A large critical legacy can stay eligible per task without being eligible globally. The verdict annotates Decision Intelligence (CC-ELIG-01).</Note>
    </Panel>
  );
}
