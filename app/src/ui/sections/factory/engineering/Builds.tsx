import { Panel } from '@/ui/widgets/cards';
import { TASK_OPTIONS, nameOptions, useRecs } from '../data';
import { RecordTable, type Ink, type Rec } from '../RecordTable';

/** Rendered rows are capped (every KPI still reads all records): hundreds of editable rows are for scanning, not typing. */
const CAP = 100;
const hint = (t: string) => <small className="ac-muted">{t}</small>;
const nm = (r: Rec) => String(r.name ?? r.id);
const TONE: Record<string, Ink> = { Success: 'teal', Failed: 'brick', Pass: 'teal', Fail: 'brick', Pending: 'amber' };

/** Commits, builds, build artefacts and quality gates. */
export function Builds() {
  const builds = useRecs('BUILDS'), artefacts = useRecs('BUILD_ARTIFACTS');
  return (
    <>
      <Panel title="💾 Commits" aside={hint('implement a Task (an existing SDLC/regulatory artefact)')}>
        <RecordTable coll="COMMITS" rows={useRecs('COMMITS')} cap={CAP} noun="commits" empty="No commits yet." addLabel="+ Add commit" label={(r) => r.id}
          cols={[{ kind: 'link', header: 'Task (implements)', field: 'taskId', emptyLabel: '(pick a task)', options: TASK_OPTIONS }, { kind: 'text', header: 'Message', field: 'message', placeholder: 'Commit message' },
            { kind: 'text', header: 'Author', field: 'author' }]} />
      </Panel>
      <Panel title="🏗️ Builds">
        <RecordTable coll="BUILDS" rows={builds} cap={CAP} noun="builds" empty="No builds yet." addLabel="+ Add build" label={nm}
          cols={[{ kind: 'text', header: 'Name', field: 'name' }, { kind: 'choice', header: 'Status', field: 'status', options: ['Success', 'Failed'], tone: TONE }, { kind: 'static', header: 'Built at', text: (r) => String(r.builtAt ?? '') }]} />
      </Panel>
      <Panel title="📦 Build Artifacts" aside={hint('produced by a Build — renamed from the referential\'s plain "Artifact" to avoid colliding with AgentCase\'s existing SDLC/regulatory artefact vocabulary')}>
        <RecordTable coll="BUILD_ARTIFACTS" rows={artefacts} cap={CAP} noun="build artefacts" empty="No build artifacts yet." addLabel="+ Add build artifact" label={nm}
          cols={[{ kind: 'text', header: 'Name', field: 'name' }, { kind: 'link', header: 'Build', field: 'buildId', options: nameOptions(builds) },
            { kind: 'choice', header: 'Type', field: 'type', options: ['Binary', 'Package', 'Container image', 'Library'] }, { kind: 'text', header: 'Version', field: 'version' }]} />
      </Panel>
      <Panel title="🚦 Quality Gates" aside={hint('a pass/fail checkpoint a Build Artifact must clear')}>
        <RecordTable coll="QUALITY_GATES" rows={useRecs('QUALITY_GATES')} cap={CAP} noun="quality gates" empty="No quality gates yet." addLabel="+ Add quality gate" label={nm}
          cols={[{ kind: 'text', header: 'Name', field: 'name' }, { kind: 'link', header: 'Build artifact', field: 'buildArtifactId', options: nameOptions(artefacts) },
            { kind: 'choice', header: 'Result', field: 'result', options: ['Pending', 'Pass', 'Fail'], tone: TONE }]} />
      </Panel>
    </>
  );
}
