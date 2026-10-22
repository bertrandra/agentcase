const KEYS: Record<string, string> = {
  selectedArtefacts: 'Artefacts SDLC retenus', artefactsEdited: 'Artefacts SDLC modifiés', selectedRegArtefacts: 'Artefacts réglementaires retenus', regArtefactsEdited: 'Artefacts réglementaires modifiés',
  phaseOff: 'Phases désactivées', phaseSeq: 'Séquences de phase', selectedNorms: 'Normes retenues', regInclude: 'Inclure le réglementaire dans l’effort', lifecycleUse: 'Cycle de vie : usage',
  lifecyclePos: 'Cycle de vie : position', statusLifecycle: 'Cycle de vie : statut', targetLocPct: 'Mix cible de localisation', forceGlassCeiling: 'Plafond de verre forcé', scurve: 'Courbe en S',
  engageCoef: 'Coefficients du contexte d’engagement', MATURITY_MAP: 'Table de maturité',
};

/** A readable name for an override address; a form field keeps its id (`values.engagementCtx` -> "Champ engagementCtx"). */
export function overrideLabel(ref: string): string {
  if (KEYS[ref]) return KEYS[ref] as string;
  const dot = ref.indexOf('.');
  return dot > 0 ? `Champ ${ref.slice(dot + 1)}${ref.startsWith('checked.') ? ' (case à cocher)' : ''}` : ref;
}
