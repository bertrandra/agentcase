/** @calc-zone exports */
/**
 * Columns of the Factory Meta-Model sheets: [header, width, field]. Program Increments / Sprints / Story Assignments have no UI and are not part of
 * the round trip.
 */
export type FmCol = [string, number, string];
export interface FmSpec { sheet: string; key: string; cols: FmCol[] }

export const FM_SPECS: FmSpec[] = [
  { sheet: 'FM Portfolio', key: 'PORTFOLIO_ITEMS', cols: [['ID', 14, 'id'], ['Name', 28, 'name']] },
  { sheet: 'FM Epic', key: 'EPICS', cols: [['ID', 14, 'id'], ['Name', 28, 'name'], ['Portfolio ID', 14, 'portfolioId']] },
  { sheet: 'FM Feature', key: 'FEATURES', cols: [['ID', 14, 'id'], ['Name', 28, 'name'], ['Epic ID', 14, 'epicId'], ['SDLC Phase IDs', 20, 'phaseIds']] },
  { sheet: 'FM Story', key: 'STORIES', cols: [['ID', 14, 'id'], ['Name', 28, 'name'], ['Feature ID', 14, 'featureId']] },
  { sheet: 'FM Release', key: 'RELEASES', cols: [['ID', 14, 'id'], ['Name', 28, 'name']] },
  { sheet: 'FM Release Items', key: 'RELEASE_ITEMS', cols: [['ID', 12, 'id'], ['Release ID', 14, 'releaseId'], ['Item Type', 14, 'itemType'], ['Item ID', 16, 'itemId'], ['Label', 30, 'label']] },
  { sheet: 'FM Release Candidates', key: 'RELEASE_CANDIDATES', cols: [['ID', 12, 'id'], ['Name', 22, 'name'], ['Release ID', 14, 'releaseId'], ['Cut At', 12, 'cutAt'], ['Status', 11, 'status']] },
  { sheet: 'FM Approvals', key: 'APPROVALS', cols: [['ID', 12, 'id'], ['RC ID', 14, 'releaseCandidateId'], ['Approver', 18, 'approver'], ['Decision', 11, 'decision'], ['Requested At', 12, 'requestedAt'], ['Decided At', 12, 'decidedAt']] },
  { sheet: 'FM Deployments', key: 'DEPLOYMENTS', cols: [['ID', 12, 'id'], ['RC ID', 14, 'releaseCandidateId'], ['Environment ID', 14, 'environmentId'], ['Deployed At', 12, 'deployedAt'], ['Status', 11, 'status']] },
  { sheet: 'FM Environments', key: 'ENVIRONMENTS', cols: [['ID', 12, 'id'], ['Name', 20, 'name'], ['Seq', 7, 'seq']] },
  { sheet: 'FM Commits', key: 'COMMITS', cols: [['ID', 12, 'id'], ['Task ID', 16, 'taskId'], ['Message', 30, 'message'], ['Author', 16, 'author'], ['Committed At', 12, 'committedAt']] },
  { sheet: 'FM Builds', key: 'BUILDS', cols: [['ID', 12, 'id'], ['Name', 22, 'name'], ['Status', 10, 'status'], ['Built At', 12, 'builtAt']] },
  { sheet: 'FM Build Artifacts', key: 'BUILD_ARTIFACTS', cols: [['ID', 12, 'id'], ['Name', 22, 'name'], ['Build ID', 14, 'buildId'], ['Type', 16, 'type'], ['Version', 10, 'version']] },
  { sheet: 'FM Quality Gates', key: 'QUALITY_GATES', cols: [['ID', 12, 'id'], ['Name', 22, 'name'], ['Build Artifact ID', 16, 'buildArtifactId'], ['Result', 9, 'result']] },
  { sheet: 'FM Monitoring', key: 'MONITORING_EVENTS', cols: [['ID', 12, 'id'], ['Deployment ID', 14, 'deploymentId'], ['Timestamp', 12, 'timestamp'], ['Description', 30, 'description'], ['Severity', 10, 'severity']] },
  { sheet: 'FM Feedback', key: 'FEEDBACK_ITEMS', cols: [['ID', 12, 'id'], ['Description', 30, 'description'], ['Created At', 12, 'createdAt'], ['Backlog Item ID (read-only)', 18, 'backlogItemId']] },
  { sheet: 'FM Backlog', key: 'BACKLOG_ITEMS', cols: [['ID', 12, 'id'], ['Description', 30, 'description'], ['Status', 10, 'status'], ['Source Feedback ID (read-only)', 20, 'sourceFeedbackId']] },
];
