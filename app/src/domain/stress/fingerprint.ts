/** @calc-zone stress */
/** Keys that do not feed the model: personas/navigation, the snapshot library, the tracker (legacy mcFingerprint deny-list). */
const EXCLUDED = new Set(['PERSONAS', 'PERSONA_SECTIONS', 'PERSONA_APP_SECTIONS', 'PERSONA_SECTION_ORDER', 'readinessAns', 'trackActuals', 'namedSnapshots', 'GROUPS', 'GROUP_COLORS',
  'sectionGroups', 'SECTION_NAV_STYLE', 'SECTION_DEPS', 'SECTION_DEPS_DESC', 'dynamicSections', 'savedAt', 'currentPersona', 'calculationPackage']);

/** djb2 hash of everything the model consumes: a run is stale when this changes after it was made. */
export function mcFingerprint(doc: Record<string, unknown>): number {
  const kept: Record<string, unknown> = {};
  for (const k of Object.keys(doc)) if (!EXCLUDED.has(k)) kept[k] = doc[k];
  const str = JSON.stringify(kept);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return h;
}
