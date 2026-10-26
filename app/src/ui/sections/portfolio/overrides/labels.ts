const KEYS: Record<string, string> = {
  selectedArtefacts: 'Selected SDLC artefacts', artefactsEdited: 'Edited SDLC artefacts', selectedRegArtefacts: 'Selected regulatory artefacts',
  regArtefactsEdited: 'Edited regulatory artefacts',
  phaseOff: 'Disabled phases', phaseSeq: 'Phase sequences', selectedNorms: 'Selected norms', regInclude: 'Include regulatory in the effort',
  lifecycleUse: 'Lifecycle: use',
  lifecyclePos: 'Lifecycle: position', statusLifecycle: 'Lifecycle: status', targetLocPct: 'Target location mix', forceGlassCeiling: 'Forced glass ceiling',
  scurve: 'S-curve',
  engageCoef: 'Engagement context coefficients', MATURITY_MAP: 'Maturity table',
};

/** A readable name for an override address; a form field keeps its id (`values.engagementCtx` -> "Champ engagementCtx"). */
export function overrideLabel(ref: string): string {
  if (KEYS[ref]) return KEYS[ref] as string;
  const dot = ref.indexOf('.');
  return dot > 0 ? `Field ${ref.slice(dot + 1)}${ref.startsWith('checked.') ? ' (checkbox)' : ''}` : ref;
}
