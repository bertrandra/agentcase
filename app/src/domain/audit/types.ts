/** @calc-zone process-model */
/**
 * The audit layer of a case (docs/SPEC_BPMN.md § 15): observed data about the process, kept apart from the model parameters. Everything is an
 * element of the case's `BPMN` document (D-B26): `ac:auditHeader` (with its calibration log) and `ac:toolCatalog` in the collaboration's
 * extension elements, `ac:audit` on the tasks and resources it describes. These types are typed views, computed, never stored.
 */
export const AUDIT_STATUSES = ['planned', 'inProgress', 'closed'] as const;
export type AuditStatus = (typeof AUDIT_STATUSES)[number];
export const SOURCES = ['interview', 'toolExport', 'measurement', 'document', 'estimate'] as const;
export type Source = (typeof SOURCES)[number];
export const CONFIDENCES = ['low', 'medium', 'high'] as const;
export type Confidence = (typeof CONFIDENCES)[number];
export const PERIODS = ['day', 'week', 'sprint', 'month', 'quarter', 'release', 'year', 'project'] as const;
export type Period = (typeof PERIODS)[number];
export const AI_USES = ['none', 'pilot', 'production'] as const;
export const LICENCES = ['commercial', 'openSource', 'saas', 'onPremise'] as const;
export const AI_FEATURES = ['none', 'assistant', 'codeGeneration', 'testGeneration', 'review', 'agent'] as const;
export const INTEGRATIONS = ['api', 'webhook', 'cli', 'mcp', 'export', 'manual'] as const;
export const HOSTINGS = ['saas', 'onPremise', 'privateCloud', 'hybrid'] as const;
export const YES_NO_LATER = ['yes', 'no', 'later'] as const;
/** The capabilities a tool serves (§ 15.2; the XSD's tokens). An activity's `capability` selects the tools proposed for it (F-B24). */
export const CAPABILITIES = ['Planning', 'Documentation', 'Knowledge', 'Analysis', 'Design', 'Coding', 'Review', 'Test', 'Security', 'Release',
  'Compliance', 'RunSupport'] as const;

/** Where a value comes from and when (every field of § 15.3 carries both). */
export interface Provenance { source?: Source; date?: string; confidence?: Confidence }

/** A tool in use on an activity or a role (§ 15.3 "Tools"). `ref` is a catalogue code (shipped or client-specific). */
export interface ToolUse extends Provenance {
  ref: string; version?: string; edition?: string; licenceCount?: number; hosting?: string; integration?: string[];
  aiFeatures?: (typeof AI_USES)[number]; dataResidency?: string; ownerTeam?: string;
}
/** One observed value (§ 15.3): a field name of `AUDIT_FIELDS`, its value, unit and period; `role` splits it per role (D-B13). */
export interface Observation extends Provenance { name: string; value: string; unit?: string; per?: Period; role?: string }
export interface PainPoint { text: string; severity: number; aiCandidate?: (typeof YES_NO_LATER)[number] }
export interface EvidenceRef { name: string; link?: string; interview?: string; confidence?: Confidence }

/** The audit of one task or resource (`ac:audit`). */
export interface ElementAudit {
  id: string; status?: AuditStatus; asOf?: string;
  tools: ToolUse[]; observations: Observation[]; painPoints: PainPoint[]; evidence: EvidenceRef[];
}

export interface Auditor { name: string; organisation?: string }
export interface Interview { code: string; role: string; who?: string; date: string }
/** One parameter changed by a calibration (F-B29): the element, the parameter, the values before and after and the formula shown. */
export type CalibratedParam = 'effort' | 'aiAuthority' | 'probability';
export interface CalibrationChange { element: string; param: CalibratedParam; from: string; to: string; formula: string }
/** One accepted calibration: one undoable step, logged in the audit header (`ac:calibration`). */
export interface CalibrationEntry { code: string; date: string; source?: string; changes: CalibrationChange[] }
export interface AuditHeader {
  code: string; client?: string; scope?: string; status: AuditStatus; asOf: string;
  auditors: Auditor[]; interviews: Interview[]; calibrations: CalibrationEntry[];
}

/** A tool of the catalogue (F-B23): shipped with the application (`catalog/tools.json`) or the case's own entry (`ac:toolCatalog`). */
export interface CatalogTool {
  code: string; name: string; vendor?: string; category?: string; licence: string[]; capabilities: string[]; aiFeatures: string[];
  integration: string[]; hosting: string[]; asOf?: string;
  /** added by the auditor for this client (kept in the case, offered for every activity of the same capability) */
  clientSpecific: boolean;
  retired: boolean;
  /** the public page the facts come from (shipped entries only) */
  source?: string;
}

/** Everything the audit of a document holds. */
export interface AuditModel {
  header?: AuditHeader;
  /** the case's catalogue entries (client-specific tools, shipped tools edited or retired for this case) and their date */
  caseTools: CatalogTool[]; catalogAsOf?: string;
  /** the `ac:audit` of each task and resource, by element id */
  elements: ReadonlyMap<string, ElementAudit>;
}
