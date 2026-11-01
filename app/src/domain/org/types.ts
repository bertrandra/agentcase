/** @calc-zone process-model */
import type { TeamRow } from '../types/state';

/**
 * The organisation model of a case (docs/SPEC_BPMN.md § 16): organisation units, teams, roles and the RACI of each activity. Units and RACI are
 * elements of the case's `BPMN` document (`ac:orgUnit`, `ac:raci`, `bpmn:resourceRole`); roles are its resources; the teams are the
 * `ac:team` elements of the common document's organisation part (schema v5, phase B10a; `domain/org/teamDoc.ts`).
 * Every type here is a typed view, computed, never stored.
 */
export const UNIT_TYPES = ['company', 'businessUnit', 'department', 'centreOfExcellence', 'vendor', 'offshoreCentre', 'nearshoreCentre', 'other'] as const;
export type UnitType = (typeof UNIT_TYPES)[number];
export const SOURCINGS = ['internal', 'vendor', 'either'] as const;
export type Sourcing = (typeof SOURCINGS)[number];

/**
 * A unit marked shared service (F-B82, phase B10c): what it does across products besides the activities pinned on its lines — every activity of
 * these team skills (the activity type, e.g. Test/QA) and every activity where one of these roles is RACI Responsible.
 */
export interface ServiceSpec { skills: string[]; roles: string[] }
export interface OrgUnit {
  id: string; name: string; type: UnitType; parent?: string; location?: string; costCentre?: string; sourcing?: Sourcing;
  /** a shared service (`service="true"` with its `skills` and `roles`); absent = not a service */
  service?: ServiceSpec;
  /** true for the default delivery unit while the document does not hold it (derived, not stored) */
  derived?: boolean;
}

/** Who serves a product, and how much of the team (percent). */
export interface Serving { productId: string; pct: number }
export interface OrgTeam {
  id: string; name: string; unit: string; lines: TeamRow[]; serves: Serving[];
  /** a team made from a shared team line (lot 7): it gives each product FTE x share */
  shared: boolean;
  /** the shared line the team comes from */
  sourceLine?: string;
  /** a shared line of a service split by effort (B10c): `serves` holds the effort split */
  byEffort?: boolean;
  /** a team read from an `ac:team` element of an imported document: shown, not in the figures (the figures read the derived teams) */
  imported?: boolean;
}

/** RACI of one activity (D-B15): Responsible actors, at most one Accountable role, Consulted and Informed roles. */
export interface Raci {
  R: string[]; A?: string; C: string[]; I: string[];
  /** FX-22: the share (%) of the activity's Responsible work each team does (team id → %), instead of the split by the teams' FTE × share */
  teams?: Record<string, number>;
}
export interface ActivityRaci {
  id: string; name: string; phase: string; type: string; inScope: boolean; effort: number;
  raci: Raci;
  /** the AI agent that performs the activity (`bpmn:performer`), when any */
  agent?: string;
  /** the role that prices the activity (its `humanPerformer`, the legacy skill): always Responsible */
  primary?: string;
  /** 'explicit' = the document holds a RACI (`ac:raci` or resource roles); 'default' = derived from the legacy skill */
  source: 'explicit' | 'default';
  /** the Accountable is the legacy skill taken by default (F-B36 "accountable to confirm") */
  accountableToConfirm: boolean;
  /** number of Accountable roles the document names (more than one is an error, F-B36) */
  accountables: number;
}

export interface OrgRole { id: string; name: string; kind: 'role' | 'agent'; teamSkill?: string; capability?: string; regulatory: boolean }

export type Severity = 'error' | 'warning' | 'info';
export type DiagnosticCode = 'noResponsible' | 'severalAccountable' | 'noAccountable' | 'noHumanAccountable' | 'accountableToConfirm'
  | 'unknownActor' | 'roleNotStaffed' | 'overAllocated';
export interface OrgDiagnostic { code: DiagnosticCode; severity: Severity; message: string; activity?: string; productId?: string; ref?: string }

/** A product of the organisation model, with its owning unit (D-B39; absent = unassigned). */
export interface ProductRef { id: string; name: string; owner?: string }
export interface OrgModel {
  units: OrgUnit[]; teams: OrgTeam[]; roles: OrgRole[]; activities: ActivityRaci[]; products: ProductRef[];
}
