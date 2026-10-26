/** @calc-zone stress */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { headlineOf } from '../economics/headline';
import { model } from '../model/overlay';
import { fmtK } from './compare';
import type { ColourRole } from '../theme';
import { withInputs } from './withInputs';

export interface SensRow { parameter: string; value: string; impactFte: string; roiImpact: string; level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }
/** `bgTone`: the colour role of the cell's heat-map background (null: no background). */
export interface SensCell { roi: number | null; text: string; bgTone: ColourRole | null; warn: boolean }
export interface SensMatrix { autos: number[]; ceils: number[]; cells: SensCell[][] }

/** The six key parameters and their (editorial) impact on target headcount and ROI. */
export function sensitivityRows(c: Ctx): SensRow[] {
  const m = model(c);
  return [
    { parameter: 'Automation potential', value: `${m.auto}%`, impactFte: '±2 FTE', roiImpact: '±0.8x', level: 'CRITICAL' },
    { parameter: 'Y3 ramp', value: `${m.ramps[2]}%`, impactFte: '±2 FTE', roiImpact: '±0.9x', level: 'CRITICAL' },
    { parameter: 'Glass ceiling', value: `${m.ceiling}%`, impactFte: '±1.8 FTE', roiImpact: '±0.6x', level: 'HIGH' },
    { parameter: 'Blended day-rate', value: `€${Math.round(m.blendedTJM)}`, impactFte: 'none', roiImpact: '±0.3x', level: 'HIGH' },
    { parameter: 'Total setup', value: fmtK(m.setupTotal), impactFte: 'none', roiImpact: '±0.15x', level: 'MEDIUM' },
    { parameter: 'Token cost', value: `€${m.tokenCost.toFixed(1)}/1M`, impactFte: 'Mix-weighted', roiImpact: '±0.05x', level: 'LOW' },
  ];
}

const bgOf = (roi: number): ColourRole => (roi >= 2.5 ? 'chart-div-pos' : roi >= 1.5 ? 'chart-div-mid' : roi >= 1 ? 'chart-div-neg' : 'chart-div-neg-strong');

/** The case with the automation potential and a forced glass ceiling moved to one matrix cell (every other input untouched). */
export const cellCtx = (c: Ctx, auto: number, ceiling: number): Ctx =>
  withInputs({ ...c, s: { ...c.s, forceGlassCeiling: true } }, { autoPotential: String(auto), glassCeiling: String(ceiling) });

/**
 * Automation × glass-ceiling matrix: each of the 20 cells reruns the case's Time Engine with the moved automation potential and glass ceiling and
 * reads its ROI from the one headline owner (DEV-SENS-RERUN: the legacy scaled the base ROI by eff / m.eff × a / m.auto, which ignored the fixed
 * setup, never changed sign and divided by zero when the potential was 0). A cell is n/a when the moved case has no setup (`roiCanonical`).
 */
export function sensitivityMatrix(c: Ctx): SensMatrix {
  const autos = [25, 35, 50, 65], ceils = [10, 15, 20, 25, 30];
  const cells = autos.map((a) => ceils.map((ce): SensCell => {
    const m = cellCtx(c, a, ce), roi = headlineOf(engineNow(m), m).roi;
    if (roi == null) return { roi: null, text: 'n/a', bgTone: null, warn: false };
    return { roi, text: `${Math.round(roi * 100)}%${roi < 0 ? ' ⚠️' : ''}`, bgTone: bgOf(roi), warn: roi < 0 };
  }));
  return { autos, ceils, cells };
}
