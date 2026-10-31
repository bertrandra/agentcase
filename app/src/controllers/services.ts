/** @calc-zone product-resolution */
import { FTE_STEP } from '@/domain/baseline/apportion';
import { readStoredOrg, type ServiceSpec } from '@/domain/org';
import * as ops from '@/domain/portfolio';
import type { XDocument } from '@/domain/process';
import { definePortfolioCommand } from '@/store/commands';
import { appStore } from '@/store/instance';
import { updateOrgUnit } from './org';
import { addSharedLine } from './sharedTeam';
import { dispatchChecked } from './portfolioGuard';

/**
 * The commands of the transverse services (docs/SPEC_BPMN.md § 21 F-B82, phase B10c). A unit is marked shared service, and given its activity
 * types and roles, through the unit command (`org.updateUnit`: attributes of its `ac:orgUnit`); a shared line joins a service and gets its split
 * rule through `sharedTeam.setUnit` / `sharedTeam.setSplit` (attributes of its `ac:team`, its shares). Each is one undoable step of node patches of
 * the common document; a refused edit changes nothing and adds no step.
 */
const unitCmd = definePortfolioCommand<{ id: string; unit: string | null }>({
  type: 'sharedTeam.setUnit', label: (p) => (p.unit ? `Move a shared team line to unit ${p.unit}` : 'Move a shared team line to the delivery unit'),
  apply: (pf, p) => ops.setLineUnit(pf, p.id, p.unit),
});
const splitCmd = definePortfolioCommand<{ id: string; split: 'effort' | 'fixed' }>({
  type: 'sharedTeam.setSplit', label: (p) => (p.split === 'effort' ? 'Split a service line by effort' : 'Split a service line by fixed shares'),
  apply: (pf, p) => ops.setLineSplit(pf, p.id, p.split),
});

const specOf = (unitId: string): ServiceSpec | undefined =>
  readStoredOrg(appStore().getState().portfolio.common.BPMN as XDocument).units.find((u) => u.id === unitId)?.service;

/** Mark a unit as a shared service (no activity type nor role yet) or unmark it; false when refused or unchanged. */
export const setUnitService = (unitId: string, on: boolean): boolean => {
  if (!!specOf(unitId) === on) return false;
  return updateOrgUnit(unitId, { service: on ? { skills: [], roles: [] } : undefined });
};
/** The activity types (team skills) of a service: every activity of these types is assigned to it. */
export const setServiceSkills = (unitId: string, skills: string[]): boolean => {
  const s = specOf(unitId);
  return !!s && updateOrgUnit(unitId, { service: { ...s, skills } });
};
/** The roles of a service: every activity where one of them is RACI Responsible is assigned to it. */
export const setServiceRoles = (unitId: string, roles: string[]): boolean => {
  const s = specOf(unitId);
  return !!s && updateOrgUnit(unitId, { service: { ...s, roles } });
};
/** Move a shared line to a unit (null: the default delivery unit); joining a service without any share splits it by effort. */
export const setSharedLineUnit = (id: string, unit: string | null): boolean => dispatchChecked(unitCmd({ id, unit }));
/** The split rule of a service line: by effort (D-B38) or by fixed shares (the override, seeded with the effort split when it holds none). */
export const setSharedLineSplit = (id: string, split: 'effort' | 'fixed'): boolean => dispatchChecked(splitCmd({ id, split }));
/** Add a line to a service (one FTE of the skill, split by effort); returns its id or null. One undoable step. */
export const addServiceLine = (unitId: string, skill = 'Test/QA'): string | null =>
  addSharedLine({ skill, grade: 'C1', loc: 'France', etp: Math.max(FTE_STEP, 1), unit: unitId, split: 'effort' });
