import type { FactoryData } from './types';

/** The six seeded promotion stages (never fewer: "clear all" resets to these, not to zero). */
export const DEFAULT_ENVIRONMENTS = [
  { id: 'env-dev', name: 'Development', seq: 1 }, { id: 'env-int', name: 'Integration', seq: 2 }, { id: 'env-sys', name: 'System Test', seq: 3 },
  { id: 'env-uat', name: 'UAT', seq: 4 }, { id: 'env-pre', name: 'Pre-production', seq: 5 }, { id: 'env-prod', name: 'Production', seq: 6, isProd: true },
];

/** An empty factory domain (legacy fmClearAllFactoryData): no records, the seeded environments, the default integrated product. */
export const EMPTY_FACTORY: FactoryData = {
  VISION: { id: 'vision-1', statement: '', updatedAt: null },
  PORTFOLIO_ITEMS: [], EPICS: [], FEATURES: [], STORIES: [], SPRINTS: [], PROGRAM_INCREMENTS: [], STORY_ASSIGNMENTS: [],
  RELEASES: [], RELEASE_ITEMS: [], RELEASE_CANDIDATES: [], APPROVALS: [], DEPLOYMENTS: [], ENVIRONMENTS: DEFAULT_ENVIRONMENTS,
  COMMITS: [], BUILDS: [], BUILD_ARTIFACTS: [], QUALITY_GATES: [], INTEGRATED_PRODUCT: { id: 'ip-1', name: 'Integrated Product', buildArtifactIds: [] },
  MONITORING_EVENTS: [], FEEDBACK_ITEMS: [], BACKLOG_ITEMS: [],
};
