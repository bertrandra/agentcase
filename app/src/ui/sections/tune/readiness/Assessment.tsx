import { READINESS_DIMS, blankReadiness, dimScore, type ReadinessAns } from '@/domain/tune';
import { setAllReadiness, setReadiness } from '@/controllers/tuneA';
import { useDoc } from '@/store/hooks';
import { Panel } from '@/ui/widgets/cards';
import { FieldChoice } from '@/ui/widgets/field/FieldChoice';

const EMPTY = blankReadiness();
const ANSWERS = [{ value: '', label: '—' }, { value: '0', label: 'No' }, { value: '50', label: 'Partial' }, { value: '100', label: 'Yes' }];
/** Read the stored answers; a case without the key behaves as a blank questionnaire. */
export const useAnswers = (): ReadinessAns => useDoc((d) => (d as { readinessAns?: ReadinessAns }).readinessAns) ?? EMPTY;

/** Assessment questionnaire: 10 dimensions x 3 statements (No / Partial / Yes), with bulk answers. */
export function Assessment() {
  const ans = useAnswers();
  return (
    <Panel title="Assessment questionnaire">
      <div className="ac-form-row">
        <button type="button" onClick={() => setAllReadiness(0)}>All No</button>
        <button type="button" onClick={() => setAllReadiness(50)}>All Partial</button>
        <button type="button" onClick={() => setAllReadiness(100)}>All Yes</button>
        <button type="button" onClick={() => setAllReadiness(null)}>Reset</button>
      </div>
      {READINESS_DIMS.map((d) => {
        const s = dimScore(ans, d.key);
        return (
          <fieldset key={d.key} className="ac-panel">
            <legend><strong>{d.label}</strong> <span className="ac-muted">{s == null ? '—' : `${Math.round(s)} / 100`}</span></legend>
            {d.q.map((q, i) => (
              <FieldChoice key={q} label={q} value={String(ans[d.key]?.[i] ?? '')} options={ANSWERS} onChange={(v) => setReadiness(d.key, i, v)}>
                <label className="ac-field"><span className="ac-field-l">{q}</span>
                  <select value={ans[d.key]?.[i] ?? ''} onChange={(e) => setReadiness(d.key, i, e.target.value)}>
                    <option value="">—</option><option value="0">No</option><option value="50">Partial</option><option value="100">Yes</option>
                  </select></label>
              </FieldChoice>
            ))}
          </fieldset>
        );
      })}
    </Panel>
  );
}
