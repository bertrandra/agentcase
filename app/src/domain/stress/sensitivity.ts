/** @calc-zone stress */
import { engineNow } from '../canonical';
import type { Ctx } from '../ctx';
import { engagementCoef } from '../engagement';
import { khMult } from '../knowledge';
import { lifecycleAutoPosture } from '../lifecycle';
import { model } from '../model/overlay';
import { fmtK } from './compare';

export interface SensRow { parameter: string; value: string; impactFte: string; roiImpact: string; level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' }
export interface SensCell { roi: number | null; text: string; bg: string; warn: boolean }
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

const bgOf = (roi: number) => (roi >= 2.5 ? '#E1F5EE' : roi >= 1.5 ? '#fff9c4' : roi >= 1 ? '#FFCCBC' : '#ffab91');

/** Automation × glass-ceiling matrix: ROI scaled from the horizon-aware base ROI (legacy renderSensitivity). */
export function sensitivityMatrix(c: Ctx): SensMatrix {
  const m = model(c), autos = [25, 35, 50, 65], ceils = [10, 15, 20, 25, 30];
  const net = engineNow(c).years().reduce((a, y) => a + y.savings, 0) - m.setupTotal;
  const baseRoi = m.setupTotal > 0 && isFinite(net) ? net / m.setupTotal : null;
  const effK = lifecycleAutoPosture(c.s) * engagementCoef(c).glassFactor * khMult(c);
  const cells = autos.map((a) => ceils.map((ce): SensCell => {
    if (baseRoi == null) return { roi: null, text: 'n/a', bg: '', warn: false };
    const eff = Math.min(100 - ce, a * effK), roi = baseRoi * (eff / m.eff) * (a / m.auto);
    return { roi, text: `${Math.round(roi * 100)}%${roi < 0 ? ' ⚠️' : ''}`, bg: bgOf(roi), warn: roi < 0 };
  }));
  return { autos, ceils, cells };
}
