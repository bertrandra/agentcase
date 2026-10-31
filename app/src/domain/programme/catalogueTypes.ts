/** @calc-zone delivery-views */
import type { LaneRole } from './lanes';
import { optInDef, type OptInId } from './optIn';

/** The types of the programme catalogue (`catalogue.ts`) and the parameter helpers of its activities. */
export type ProgrammePhase = 'engagement' | 'setup' | 'run' | 'assurance';
/** § 19.3: labour from resources, a non-labour cost item, an engine figure displayed, the hub setup placed earlier, a new opt-in cost, none. */
export type CostRule = 'resources' | 'nonLabour' | 'engine' | 'sameAsHubSetup' | 'optIn' | 'none';
export const COST_RULE_TEXT: Record<CostRule, string> = {
  resources: 'Labour from resources: role effort × the role rate (rate card × target location mix)', nonLabour: 'Non-labour cost item (an amount)',
  engine: 'Engine result, displayed (never recomputed)', sameAsHubSetup: 'The hub setup amount, placed earlier (never added)',
  optIn: 'New cost from resources, off by default (D-B31): switch it on to add it to the programme cost', none: 'No cost of its own',
};
/** Where the timing owner places the activity (`timing.ts`). */
export type TimingKind = 'stage' | 'gate' | 'pilot' | 'setup' | 'hubSetup' | 'ktPrep' | 'build' | 'run' | 'hubRun' | 'case' | 'optIn';
export interface ParamDef {
  key: string; label: string; unit: string; min?: number; max?: number; step?: number;
  /** `values`: a case input; `knowledge`: the product's knowledge subset (portfolio) */
  store?: 'values' | 'knowledge';
  options?: readonly { value: string; label: string }[];
  /** shown only with one product (a portfolio edits it on the shared hub card) */
  singleOnly?: boolean;
}
export interface ProgrammeActivityDef {
  kind: string; name: string; description: string; phase: ProgrammePhase; lane: LaneRole;
  raci: { A?: LaneRole; C: LaneRole[]; I: LaneRole[] };
  level: 'case' | 'product'; costRule: CostRule; timing: TimingKind; params: ParamDef[];
  /** the module that sizes or prices it today */
  source: string;
  /** the case switch it depends on (the activity is in the process only when the module is on) */
  module?: 'khEnabled' | 'hriEnabled';
}

export const EUR = (key: string, label: string, step = 5000): ParamDef => ({ key, label, unit: '€', min: 0, step });
const ON_OFF = [{ value: '', label: 'Off (default: not in the cost)' }, { value: 'on', label: 'On: in the programme cost' }];
/** The switch and the parameters of an opt-in cost (`optIn.ts`), as panel fields. */
export function optInParams(id: OptInId, only?: string[]): ParamDef[] {
  const d = optInDef(id);
  return [{ key: d.on, label: `Include ${d.label.toLowerCase()} in the cost (opt-in)`, unit: '', options: ON_OFF },
    ...d.params.filter((p) => !only || only.includes(p.key)).map((p) => ({ key: p.key, label: `${p.label} — default ${p.def}`, unit: p.unit, min: 0,
      step: p.step }))];
}
