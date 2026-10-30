/** @calc-zone process-model */
import type { ActivityView } from './readTypes';

/**
 * The BPMN import (spec § 4.3, F-B6–F-B9, D-B4, D-B10; phase B4): what a file holds as AgentCase sees it, the user's choices, and the preview.
 * A file written by AgentCase (its phases carry `ac:phase`) is read with its own parameters; any other file is mapped: each task belongs to a
 * unit (a top-level sub-process, else its lane, else its process) that maps to a phase, and names roles (its lane, its performers' resources)
 * that map to team skills.
 */
export interface IncomingTask {
  id: string; name: string;
  /** the BPMN element (`userTask`, `task`, `sendTask`…) */
  element: string;
  /** key of the unit it belongs to (`IncomingUnit.key`) */
  unit: string;
  /** role names of the task (lane, performer resources), first = the performer */
  roles: string[];
  inScope: boolean;
  /** the case's activity it is (same id, or for a foreign task the same name), when there is one */
  match?: string;
  /** the activity as the file's `ac:` data says (AgentCase files only) */
  view?: ActivityView;
}
export interface IncomingUnit {
  key: string; name: string; kind: 'phase' | 'subProcess' | 'lane' | 'process';
  /** the case's phase it maps to by id or name, or null when the user has to choose */
  phase: string | null;
}
export interface IncomingRole {
  name: string;
  /** the case's role of that name (its exact name), or null for a new role */
  known: string | null;
  /** team skill of the known role, or the team skill of the same name, or null */
  teamSkill: string | null;
}
export interface ImportAnalysis {
  /** written by AgentCase: phases with `ac:phase`, activities with `ac:activity` */
  agentcase: boolean;
  /** an in-scope-only export (F-B3): refused as a replacement */
  partial: boolean;
  tasks: IncomingTask[]; units: IncomingUnit[]; roles: IncomingRole[];
  /** elements the import does not map, by kind (events, gateways, flows, data stores, other pools, vendor extensions…), with their count */
  ignored: Record<string, number>;
}

export type ImportMode = 'replace' | 'merge';
export interface ImportChoices {
  mode: ImportMode;
  /** merge: what happens to the case's activities the file does not have */
  missing: 'keep' | 'outOfScope';
  /** D-B4: the file's out-of-scope activities are imported (still out of scope) or left out */
  fileOutOfScope: 'include' | 'skip';
  /** unit key → phase id (the user's mapping of unknown units; a known unit maps to its phase unless overridden) */
  phaseOf: Record<string, string>;
  /** new role name → team skill (D-B10) */
  teamSkillOf: Record<string, string>;
}

/** What an import will do (the preview) and did (the report's lists): activity ids, by outcome. */
export interface ImportPreview {
  added: string[]; updated: string[]; outOfScope: string[]; removed: string[]; skipped: string[];
  /** added activities whose parameters were defaulted (no `ac:` data): "parameters to review" */
  defaulted: string[];
  /** roles created with the team skill the user chose */
  newRoles: { name: string; teamSkill: string }[];
  /** units and roles still without a mapping (the import is refused until there is none) */
  unmappedUnits: string[]; unmappedRoles: string[];
  /** why the import cannot run as chosen, or null */
  refusal: string | null;
}

export const DEFAULT_CHOICES: ImportChoices = { mode: 'merge', missing: 'keep', fileOutOfScope: 'include', phaseOf: {}, teamSkillOf: {} };
