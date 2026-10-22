/** @calc-zone workspace-config */
/** Records of the Software/Agentic Factory meta-model, exactly as the case snapshot carries them (STATE_REGISTRY keys). */
export interface Vision { id: string; statement: string; updatedAt: string | null }
export interface Portfolio { id: string; name: string }
export interface Epic { id: string; name: string; portfolioId: string | null }
export interface Feature { id: string; name: string; epicId: string | null }
export interface Story {
  id: string; name: string; featureId: string | null;
  derivedWeight?: number; derivedHumanSup?: number; phaseId?: string; capability?: string;
}
export interface Sprint { id: string; name: string; startAt: string; endAt: string }
export interface StoryAssignment { id: string; storyId: string; sprintId: string; teamId: string | null }
export interface Release { id: string; name: string }
export type ReleaseItemType = 'Story' | 'Feature' | 'Fix' | 'TechnicalChange';
export interface ReleaseItem { id: string; releaseId: string; itemType: ReleaseItemType; itemId: string | null; label: string | null }
export interface ReleaseCandidate { id: string; name: string; releaseId: string | null; cutAt: string; status: string }
export interface Approval { id: string; releaseCandidateId: string | null; approver: string; decision: string; requestedAt: string; decidedAt: string | null }
export interface Environment { id: string; name: string; seq: number; isProd?: boolean }
export interface Deployment { id: string; releaseCandidateId: string | null; environmentId: string | null; deployedAt: string; status: string }
export interface Commit { id: string; taskId: string | null; message: string; author: string; committedAt: string }
export interface Build { id: string; name: string; status: string; builtAt: string }
export interface BuildArtifact { id: string; name: string; buildId: string | null; type: string; version: string }
export interface QualityGate { id: string; name: string; buildArtifactId: string | null; result: string }
export interface IntegratedProduct { id: string; name: string; buildArtifactIds: string[] }
export interface MonitoringEvent { id: string; deploymentId: string | null; timestamp: string; description: string; severity: string }
export interface Feedback { id: string; description: string; createdAt: string; backlogItemId: string | null }
export interface BacklogItem { id: string; description: string; status: string; sourceFeedbackId: string | null }
export interface ArtefactTag { id: string; storyId: string | null; capability?: string; agentActivityType?: string }
export interface PhaseFeatures { id: string; featureIds: string[] | null }

export interface FgParams {
  sprintWeeks: number; piWeeks: number; releaseEveryWeeks: number; rcLeadDays: number; approvalRejectRate: number; approvalLeadDays: number;
  envPromotionDays: number; deployFailRate: number; rollbackRate: number; retryDelayDays: number; commitsPerAgentRun: number; humanCommitsPerDevWeek: number;
  buildsPerWeek: number; buildFailRate: number; artefactsPerBuild: number; incidentsPerProdDeploy: number; sevCritical: number; sevWarning: number;
  feedbackPerRelease: number; gateFailRate: number; rollWeeks: number; minSample: number; density: number; maxRecords: number; seed: number;
}
export interface FgProvenance {
  at: string; seed: number; weeks: number; volScale: number; curve: string; curveMeans: number[]; from: string; phases: number; ramps: number[];
  eff: number; ceiling: number; records: number; ms: number;
}

/** Every array of the factory domain (the keys a "clear all" or a generation replaces). */
export interface FactoryData {
  VISION: Vision; PORTFOLIO_ITEMS: Portfolio[]; EPICS: Epic[]; FEATURES: Feature[]; STORIES: Story[]; SPRINTS: Sprint[]; PROGRAM_INCREMENTS: Sprint[];
  STORY_ASSIGNMENTS: StoryAssignment[]; RELEASES: Release[]; RELEASE_ITEMS: ReleaseItem[]; RELEASE_CANDIDATES: ReleaseCandidate[]; APPROVALS: Approval[];
  DEPLOYMENTS: Deployment[]; ENVIRONMENTS: Environment[]; COMMITS: Commit[]; BUILDS: Build[]; BUILD_ARTIFACTS: BuildArtifact[]; QUALITY_GATES: QualityGate[];
  INTEGRATED_PRODUCT: IntegratedProduct; MONITORING_EVENTS: MonitoringEvent[]; FEEDBACK_ITEMS: Feedback[]; BACKLOG_ITEMS: BacklogItem[];
}
