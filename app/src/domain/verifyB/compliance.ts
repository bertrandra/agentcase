/** @calc-zone delivery-views */
import type { Ctx } from '../ctx';
import { INDUSTRIES } from '../frame/profile';
import { model } from '../model/overlay';

/** Glass ceiling a sector implies from its regulatory artefact count (legacy sector table / industry cascade), in %. */
export const sectorCeiling = (code: string, regArtifacts: number): number => Math.min(40, Math.round(((regArtifacts || 0) / 40) * 30) + (code === 'NONE' ? 0 : 8));

/** Regulatory compliance: cards of the selected sector and the sector comparison (ceiling, max automatable, regulatory artefacts). */
export function complianceView(c: Ctx) {
  const cur = c.inp.v('industry'), selected = INDUSTRIES.find((i) => i.code === cur) ?? INDUSTRIES[0]!, ceil = model(c).ceiling;
  return {
    cards: [
      ['Industry', selected.code === 'NONE' ? 'None' : selected.code, selected.norms || '—'], ['Glass ceiling', `${ceil}%`, 'human work required'],
      ['Reg. artifacts', String(selected.regArtifacts || 0), 'compliance documents'], ['Max automatable', `${100 - ceil}%`, 'potential at maturity'],
    ] as [string, string, string][],
    sectors: INDUSTRIES.map((i) => {
      const g = sectorCeiling(i.code, i.regArtifacts);
      return { code: i.code, name: i.code === 'NONE' ? 'None' : i.name, norms: i.norms || '—', ceiling: g, max: 100 - g, reg: i.regArtifacts || 0, selected: i.code === selected.code };
    }),
  };
}
