import { autoIncludePassing, setIpName, toggleIpArtifact } from '@/controllers/factoryActions';
import type { IntegratedProduct as IP } from '@/domain/factory/types';
import { useDoc } from '@/store/hooks';
import { TextField } from '@/ui/widgets/CommitField';
import { Panel } from '@/ui/widgets/cards';
import { useRecs } from '../data';
import type { Ink } from '../RecordTable';

const EMPTY: IP = { id: 'ip-1', name: '', buildArtifactIds: [] };
const RESULT: Record<string, Ink> = { Pass: 'teal', Fail: 'brick', Pending: 'amber' };

/** The current integration baseline: which build artefacts it is composed of (with the gate result beside each). */
export function IntegratedProduct() {
  const ip = useDoc((d) => ((d as Record<string, unknown>).INTEGRATED_PRODUCT as IP | undefined) ?? EMPTY);
  const arts = useRecs('BUILD_ARTIFACTS'), gates = useRecs('QUALITY_GATES'), included = new Set(ip.buildArtifactIds ?? []);
  return (
    <Panel title="🧬 Integrated Product" aside={<small className="ac-muted">the current, continuously-updated integration baseline</small>}>
      <TextField label="Name" value={ip.name} onChange={setIpName} width={360} />
      <p className="ac-muted">Composed of {included.size} of {arts.length} build artifact(s):</p>
      {arts.length ? arts.map((a) => {
        const gate = gates.find((g) => g.buildArtifactId === a.id);
        return (
          <label key={a.id} className="ac-check">
            <input type="checkbox" aria-label={`Include ${String(a.name)}`} checked={included.has(a.id)} onChange={(e) => toggleIpArtifact(a.id, e.target.checked)} />
            {String(a.name)} <span className="ac-muted">({String(a.type)} {String(a.version)})</span>{gate && <span data-ink={RESULT[String(gate.result)]}> {String(gate.result)}</span>}
          </label>
        );
      }) : <p className="ac-muted">No build artifacts to include yet.</p>}
      <button type="button" onClick={autoIncludePassing}>↻ Auto-include all Pass gates</button>
    </Panel>
  );
}
