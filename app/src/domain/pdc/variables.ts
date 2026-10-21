import { ENGINE_VARS } from './vars/engine';
import { FACTORY_VARS } from './vars/factory';
import { FINANCE_VARS } from './vars/finance';
import { GLOBAL_VARS } from './vars/global';
import { ORDER } from './vars/order';
import { REGISTER_VARS } from './vars/register';
import { SCOPE_VARS } from './vars/scope';
import { TEAM_VARS } from './vars/team';
import { TOGGLE_VARS } from './vars/toggles';
import { TUNE_VARS } from './vars/tune';
import type { VariableDef } from './vars/types';

export { NO_RUNTIME, type VarRuntime, type VarValue, type VariableDef } from './vars/types';

const rank = new Map(ORDER.map((id, i) => [id, i]));
/**
 * The bindable variables of the Board: the 166 entries of the legacy VARIABLE_REGISTRY, in its order (id, label, canonical format, unit,
 * section scope, getter). Families live in `vars/`; a getter is a pure function of the case (and, for the Monte Carlo ones, of the
 * session runtime). A card bound to a value that cannot be computed shows a dash.
 */
export const VARIABLES: VariableDef[] = [...GLOBAL_VARS, ...FINANCE_VARS, ...TEAM_VARS, ...SCOPE_VARS, ...TUNE_VARS, ...ENGINE_VARS, ...TOGGLE_VARS, ...FACTORY_VARS, ...REGISTER_VARS]
  .sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9));

export const variableById = (id: string | null | undefined): VariableDef | undefined => VARIABLES.find((x) => x.id === id);
export const variablesForSection = (section: string): VariableDef[] => VARIABLES.filter((x) => x.scope === section || x.scope === 'GLOBAL');
