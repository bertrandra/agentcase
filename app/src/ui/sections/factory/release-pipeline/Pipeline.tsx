import { feedbackToBacklog, setApprovalDecision } from '@/controllers/factoryActions';
import type { Environment } from '@/domain/factory/types';
import { Panel } from '@/ui/widgets/cards';
import { nameOptions, useRecs } from '../data';
import { RecordTable, type Ink, type Rec } from '../RecordTable';

const hint = (t: string) => <small className="ac-muted">{t}</small>;
const nm = (r: Rec) => String(r.name ?? r.id);
const TONE: Record<string, Ink> = { Success: 'teal', Failed: 'brick', RolledBack: 'amber', Info: 'blue', Warning: 'amber', Critical: 'brick' };
const text = (v: unknown) => String(v ?? '');

const decisionInk = (d: unknown): Ink => (d === 'Approved' ? 'teal' : d === 'Rejected' ? 'brick' : 'amber');

/** Candidates, approvals, deployments, environments, monitoring, feedback and backlog: the rest of the release flow. */
export function Pipeline() {
  const releases = useRecs('RELEASES'), rcs = useRecs('RELEASE_CANDIDATES'), envs = useRecs('ENVIRONMENTS') as unknown as (Rec & Environment)[],
    deps = useRecs('DEPLOYMENTS');
  const envName = (id: unknown) => envs.find((e) => e.id === id)?.name ?? '(none)';
  const decision = (r: Rec) => (
    <select aria-label={`Decision of ${r.id}`} value={text(r.decision)} className="ac-fill ac-choice is-toned" data-ink={decisionInk(r.decision)}
      onChange={(e) => setApprovalDecision(r.id, e.target.value)}>
      {['Pending', 'Approved', 'Rejected'].map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  const backlogCell = (r: Rec) => (r.backlogItemId
    ? <span data-ink="teal">✓ backlog item created</span>
    : <button type="button" onClick={() => feedbackToBacklog(r.id)}>→ Create backlog item</button>);
  return (
    <>
      <Panel title="🏷️ Release Candidates" aside={hint('a cut proposed for a Release')}>
        <RecordTable coll="RELEASE_CANDIDATES" rows={rcs} noun="release candidates" empty="No release candidates yet." addLabel="+ Add release candidate"
          label={nm}
          cols={[{ kind: 'text', header: 'Name', field: 'name' }, { kind: 'link', header: 'Release', field: 'releaseId', options: nameOptions(releases) },
            { kind: 'static', header: 'Cut at', text: (r) => text(r.cutAt) },
            { kind: 'choice', header: 'Status', field: 'status', options: ['Draft', 'Cut', 'Superseded'] }]} />
      </Panel>
      <Panel title="✅ Approvals" aside={hint('gate a Release Candidate before deployment')}>
        <RecordTable coll="APPROVALS" rows={useRecs('APPROVALS')} noun="approvals" empty="No approvals yet." addLabel="+ Add approval" label={(r) => r.id}
          cols={[{ kind: 'link', header: 'Release candidate', field: 'releaseCandidateId', options: nameOptions(rcs) },
            { kind: 'text', header: 'Approver', field: 'approver', placeholder: 'Who approves' },
            { kind: 'custom', header: 'Decision', render: decision }, { kind: 'static', header: 'Decided',
              text: (r) => (r.decidedAt ? text(r.decidedAt) : '—') }]} />
      </Panel>
      <Panel title="🚚 Deployments" aside={hint('promote a Release Candidate into an Environment')}>
        <RecordTable coll="DEPLOYMENTS" rows={deps} noun="deployments" empty="No deployments yet." addLabel="+ Add deployment" label={(r) => r.id}
          cols={[{ kind: 'link', header: 'Release candidate', field: 'releaseCandidateId', options: nameOptions(rcs) },
            { kind: 'link', header: 'Environment', field: 'environmentId', options: nameOptions(envs) },
            { kind: 'static', header: 'Date', text: (r) => text(r.deployedAt) },
            { kind: 'choice', header: 'Status', field: 'status', options: ['Success', 'Failed', 'RolledBack'], tone: TONE }]} />
      </Panel>
      <Panel title="🪜 Environments" aside={hint('the promotion pipeline — Production is the last stage')}>
        <RecordTable coll="ENVIRONMENTS" rows={[...envs].sort((a, b) => (a.seq || 0) - (b.seq || 0))} noun="environments" empty="No environments."
          addLabel="+ Add environment stage" label={nm} canDelete={envs.length > 1}
          cols={[{ kind: 'static', header: 'Seq', text: (r) => text(r.seq) }, { kind: 'text', header: 'Name', field: 'name' }]} />
      </Panel>
      <Panel title="📡 Monitoring" aside={hint('runtime signals observed after a Deployment')}>
        <RecordTable coll="MONITORING_EVENTS" rows={useRecs('MONITORING_EVENTS')} noun="monitoring events" empty="No monitoring events yet."
          addLabel="+ Add monitoring event" label={(r) => r.id}
          cols={[{ kind: 'link', header: 'Deployment', field: 'deploymentId',
            options: deps.map((d) => ({ value: d.id, label: `${envName(d.environmentId)} · ${text(d.deployedAt)}` })) },
            { kind: 'text', header: 'Description', field: 'description', placeholder: 'What was observed' },
            { kind: 'choice', header: 'Severity', field: 'severity', options: ['Info', 'Warning', 'Critical'], tone: TONE }]} />
      </Panel>
      <Panel title="💬 Feedback" aside={hint('creates a Backlog item, closing the loop')}>
        <RecordTable coll="FEEDBACK_ITEMS" rows={useRecs('FEEDBACK_ITEMS')} noun="feedback items" empty="No feedback yet." addLabel="+ Add feedback"
          label={(r) => r.id}
          cols={[{ kind: 'text', header: 'Description', field: 'description', placeholder: 'What was fed back' },
            { kind: 'custom', header: 'Backlog', render: backlogCell }]} />
      </Panel>
      <Panel title="📋 Backlog">
        <RecordTable coll="BACKLOG_ITEMS" rows={useRecs('BACKLOG_ITEMS')} noun="backlog items" empty="No backlog items yet." addLabel="+ Add backlog item"
          label={(r) => r.id}
          cols={[{ kind: 'text', header: 'Description', field: 'description' },
            { kind: 'choice', header: 'Status', field: 'status', options: ['New', 'Planned', 'Done'] },
            { kind: 'static', header: 'Source', text: (r) => (r.sourceFeedbackId ? 'Feedback' : 'Manual') }]} />
      </Panel>
    </>
  );
}
