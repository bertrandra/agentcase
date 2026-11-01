/** @calc-zone process-model */
/** The organisation model (docs/SPEC_BPMN.md § 16): units, teams, roles and RACI, read from the case's BPMN document and its entry teams. */
export * from './types';
export { orgOf, unitTree, isBelow, type OrgSource } from './model';
export { readRaci, activityElements, RACI_ROLE_NAMES } from './readRaci';
export { readStoredOrg, collaborationOf, type StoredOrg } from './readUnits';
export { isStoredTeam, storedTeams, teamRowsIn, sharedLineIn, productRowsIn, ownerIn, caseTeamIn, lineRow, type StoredTeams } from './teamDoc';
export { withProductTeam, withoutProductTeam, withOwner, withSharedLines } from './teamWrite';
export { withoutTeams, withoutOrg, withTeamsOf, withOrgOf, withUnits, storedTeamElements, unitElements } from './teamStrip';
export { isCarrier, carrier, orgExtOf } from './orgExt';
export { unitAncestors, unitDescendants, productsOfUnit, UNASSIGNED } from './ownership';
export { DEFAULT_UNIT_ID, defaultUnit, defaultUnitInput, derivedTeams, teamRowsOf, teamsServing, servingPct, productTeamId, sharedTeamId,
  type EffortShares } from './teams';
export { orgDiagnostics, raciDiagnostics, unstaffed, skillsOf, countBySeverity } from './diagnostics';
export { byActivity, byRole, byTeam, providers, lettersOf, LETTERS, rShare, fteOn, type Letter, type ActivityAnswer, type RoleAnswer, type TeamAnswer,
  type PerProduct, type Provider } from './views';
export { byUnit, byProduct, type UnitAnswer, type ProductAnswer, type ChartUnit, type ChartTeam, type Bucket } from './viewsUnit';
export { addUnit, updateUnit, removeUnit, freeUnitId, withUnitList, type UnitInput, type UnitPatch } from './editUnits';
export { setRaci, clearRaci } from './editRaci';
export { organisationLaneSet, organisationView } from './orgView';
export { serviceDefs, serviceActivities, effortSplit, effortOf, lineUnit, type ServiceActivity, type ServiceDef, type ProductWork, type Via,
  type WorkActivity } from './services';
