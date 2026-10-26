/** @calc-zone workspace-config */
import type { FactoryData } from './types';

/** The record collections the generic add / set / remove commands work on (state keys of the case). */
export type Coll = 'PORTFOLIO_ITEMS' | 'EPICS' | 'FEATURES' | 'STORIES' | 'RELEASES' | 'RELEASE_CANDIDATES' | 'APPROVALS' | 'DEPLOYMENTS' | 'ENVIRONMENTS'
  | 'MONITORING_EVENTS' | 'FEEDBACK_ITEMS' | 'BACKLOG_ITEMS' | 'COMMITS' | 'BUILDS' | 'BUILD_ARTIFACTS' | 'QUALITY_GATES';
type Rec = { id: string; [k: string]: unknown };
type Data = Partial<Record<keyof FactoryData, unknown>>;

/** Legacy fmIdGen: prefix-N where N starts at length+1 and skips taken ids. */
export function nextId(prefix: string, arr: { id: string }[]): string {
  let n = arr.length + 1, id = `${prefix}-${n}`;
  while (arr.some((x) => x.id === id)) { n++; id = `${prefix}-${n}`; }
  return id;
}
const first = (d: Data, k: keyof FactoryData): string | null => ((d[k] as Rec[] | undefined)?.[0]?.id) ?? null;

/** Id prefix and the defaults of a new record, per collection (linked to the first record of its parent collection, dated today). */
export const NEW_RECORD: Record<Coll, { prefix: string; make(d: Data, today: string): Record<string, unknown> }> = {
  PORTFOLIO_ITEMS: { prefix: 'portfolio', make: () => ({ name: 'New portfolio item' }) },
  EPICS: { prefix: 'epic', make: (d) => ({ name: 'New epic', portfolioId: first(d, 'PORTFOLIO_ITEMS') }) },
  FEATURES: { prefix: 'feature', make: (d) => ({ name: 'New feature', epicId: first(d, 'EPICS') }) },
  STORIES: { prefix: 'story', make: (d) => ({ name: 'New story', featureId: first(d, 'FEATURES') }) },
  RELEASES: { prefix: 'release', make: () => ({ name: 'New release' }) },
  RELEASE_CANDIDATES: { prefix: 'rc', make: (d, t) => ({ name: 'New RC', releaseId: first(d, 'RELEASES'), cutAt: t, status: 'Draft' }) },
  APPROVALS: { prefix: 'appr',
    make: (d, t) => ({ releaseCandidateId: first(d, 'RELEASE_CANDIDATES'), approver: '', decision: 'Pending', requestedAt: t, decidedAt: null }) },
  DEPLOYMENTS: { prefix: 'deploy',
    make: (d, t) => ({ releaseCandidateId: first(d, 'RELEASE_CANDIDATES'), environmentId: first(d, 'ENVIRONMENTS'), deployedAt: t, status: 'Success' }) },
  ENVIRONMENTS: { prefix: 'env',
    make: (d) => ({ name: 'New environment',
    seq: ((d.ENVIRONMENTS as { seq?: number }[] | undefined) ?? []).reduce((m, e) => Math.max(m, e.seq || 0), 0) + 1 }) },
  MONITORING_EVENTS: { prefix: 'mon', make: (d, t) => ({ deploymentId: first(d, 'DEPLOYMENTS'), timestamp: t, description: '', severity: 'Info' }) },
  FEEDBACK_ITEMS: { prefix: 'fb', make: (_d, t) => ({ description: '', createdAt: t, backlogItemId: null }) },
  BACKLOG_ITEMS: { prefix: 'backlog', make: () => ({ description: 'New backlog item', status: 'New', sourceFeedbackId: null }) },
  COMMITS: { prefix: 'commit', make: (_d, t) => ({ taskId: null, message: '', author: '', committedAt: t }) },
  BUILDS: { prefix: 'build', make: (_d, t) => ({ name: 'New build', status: 'Success', builtAt: t }) },
  BUILD_ARTIFACTS: { prefix: 'bart', make: (d) => ({ name: 'New build artifact', buildId: first(d, 'BUILDS'), type: 'Package', version: '0.1.0' }) },
  QUALITY_GATES: { prefix: 'gate', make: (d) => ({ name: 'New quality gate', buildArtifactId: first(d, 'BUILD_ARTIFACTS'), result: 'Pending' }) },
};

/** What deleting a record does to the records that point at it: orphan them (null the link), delete them (pure join rows) or pull the id from a list. */
export const ON_REMOVE: Partial<Record<Coll, { coll: string; field: string; mode: 'null' | 'delete' | 'pull' }[]>> = {
  PORTFOLIO_ITEMS: [{ coll: 'EPICS', field: 'portfolioId', mode: 'null' }],
  EPICS: [{ coll: 'FEATURES', field: 'epicId', mode: 'null' }],
  FEATURES: [{ coll: 'STORIES', field: 'featureId', mode: 'null' }],
  RELEASES: [{ coll: 'RELEASE_ITEMS', field: 'releaseId', mode: 'delete' }, { coll: 'RELEASE_CANDIDATES', field: 'releaseId', mode: 'null' }],
  RELEASE_CANDIDATES: [{ coll: 'APPROVALS', field: 'releaseCandidateId', mode: 'null' }, { coll: 'DEPLOYMENTS', field: 'releaseCandidateId', mode: 'null' }],
  DEPLOYMENTS: [{ coll: 'MONITORING_EVENTS', field: 'deploymentId', mode: 'null' }],
  ENVIRONMENTS: [{ coll: 'DEPLOYMENTS', field: 'environmentId', mode: 'null' }],
  BUILDS: [{ coll: 'BUILD_ARTIFACTS', field: 'buildId', mode: 'null' }],
  BUILD_ARTIFACTS: [{ coll: 'QUALITY_GATES', field: 'buildArtifactId', mode: 'null' }],
};
