import { useId } from 'react';
import { removeProcessActivity, updateProcessActivity } from '@/controllers/process';
import { moveProcessActivity } from '@/controllers/processLayout';
import { readProcess, type XDocument } from '@/domain/process';
import { activityDetail } from '@/domain/programme';
import { DetailLinks } from '@/ui/widgets/DetailLinks';
import { selectActivity } from './view';

const num = (s: string): number | undefined => (s.trim() === '' || !Number.isFinite(Number(s)) ? undefined : Number(s));

/**
 * The selected activity (spec F-B16): its name, phase (`process.moveActivity`), effort and supervision split (`process.updateActivity`,
 * coalesced while typing), and "Remove" (`process.removeActivity`). Every change is one undoable step; the figures of a custom activity count
 * from phase B5 on. A link opens the screen where the activity's details live (its artefact row in 🎯 Scope, `activityDetail`).
 */
export function ActivityPanel({ doc, id }: { doc: XDocument; id: string }) {
  const v = readProcess(doc), a = v.activities.find((x) => x.id === id), k = useId();
  if (!a) return null;
  const names = new Map(v.actors.map((r) => [r.id, r.name]));
  const inRework = v.flows.some((f) => f.rework && (f.rework.activityA === id || f.rework.activityB === id));
  const field = (key: 'effort' | 'humanSup' | 'agentSup', label: string, value: number) => (
    <label htmlFor={`${k}-${key}`}>{label}
      <input id={`${k}-${key}`} type="number" min={0} max={key === 'effort' ? undefined : 100} step="any" value={value}
        onChange={(e) => { const n = num(e.target.value); if (n !== undefined) updateProcessActivity(id, { [key]: n }); }} />
    </label>
  );
  return (
    <section className="ac-proc-panel" aria-labelledby={`${k}-h`}>
      <h2 id={`${k}-h`}>{`${a.id} · ${a.name}`}</h2>
      <dl className="ac-proc-facts">
        <dt>Type</dt><dd>{`${a.type}${a.regulatory ? ' (regulatory)' : ''}`}</dd>
        <dt>Role</dt><dd>{names.get(a.humanPerformer ?? '') ?? '—'}</dd>
        {a.performer && <><dt>Agent</dt><dd>{names.get(a.performer) ?? a.performer}</dd></>}
        <dt>Value class</dt><dd>{a.value || '—'}</dd>
        <dt>AI authority</dt><dd>{a.aiAuthority || '—'}</dd>
        {a.deliverable && <><dt>Deliverable</dt><dd>{a.deliverable}</dd></>}
      </dl>
      <DetailLinks id={a.id} name={a.name} detail={activityDetail(a.id, v.activities)} />
      <div className="ac-proc-fields">
        <label htmlFor={`${k}-name`}>Name
          <input id={`${k}-name`} type="text" value={a.name} onChange={(e) => updateProcessActivity(id, { name: e.target.value })} />
        </label>
        <label htmlFor={`${k}-phase`}>Phase
          <select id={`${k}-phase`} value={a.phase} disabled={inRework} onChange={(e) => moveProcessActivity(id, e.target.value)}>
            {v.phases.map((p) => <option key={p.id} value={p.id}>{`${p.id} · ${p.name}`}</option>)}
          </select>
        </label>
        {field('effort', 'Effort', a.effort)}
        {field('humanSup', 'Human supervision %', a.human)}
        {field('agentSup', 'Agent supervision %', a.agent)}
      </div>
      {inRework && <p className="ac-muted">Part of a rework loop: it stays in its phase.</p>}
      <div className="ac-form-row">
        <button type="button" onClick={() => { removeProcessActivity(id); selectActivity(null); }}>Remove activity</button>
        <button type="button" onClick={() => selectActivity(null)}>Close</button>
      </div>
    </section>
  );
}
