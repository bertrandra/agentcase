/** @calc-zone stress */
import { BPMN_KEY } from '../process/scope';
import { serialize } from '../process/xmlWrite';
import { editWhere } from '../process/editTree';
import { NS, withAttrs, type XDocument, type XElement } from '../process/xml';

/**
 * The organisation attributes no figure reads (SPEC_FIXES FX-D1, decided (a)): a product's owning unit (`owner` on its team) and a unit's name, kind,
 * place in the tree, location, cost centre and sourcing. A change of those alone leaves a Monte Carlo run current; the teams, the shared lines
 * and their unit, and a unit's service (skills, roles) still count — they move figures. Memoised on the document.
 */
const NOT_READ: Record<string, Record<string, null>> = {
  team: { owner: null },
  orgUnit: { name: null, type: null, parent: null, location: null, costCentre: null, sourcing: null },
};
const figureText = new WeakMap<XDocument, string>();
function figureDoc(d: XDocument): string {
  let t = figureText.get(d);
  if (t === undefined) {
    const isOrg = (e: XElement): boolean => e.ns === NS.ac && e.local in NOT_READ;
    t = serialize({ ...d, root: editWhere(d.root, isOrg, (e) => withAttrs(e, NOT_READ[e.local]!)) });
    figureText.set(d, t);
  }
  return t;
}
/** Keys that do not feed the model: personas/navigation, the snapshot library, the tracker (legacy mcFingerprint deny-list). */
const EXCLUDED = new Set(['PERSONAS', 'PERSONA_SECTIONS', 'PERSONA_APP_SECTIONS', 'PERSONA_SECTION_ORDER', 'readinessAns', 'trackActuals', 'namedSnapshots',
  'GROUPS', 'GROUP_COLORS',
  'sectionGroups', 'SECTION_NAV_STYLE', 'SECTION_DEPS', 'SECTION_DEPS_DESC', 'dynamicSections', 'savedAt', 'currentPersona', 'calculationPackage']);

/** djb2 hash of everything the model consumes (the process document as its XML text): a run is stale when this changes after it was made. */
export function mcFingerprint(doc: Record<string, unknown>): number {
  const kept: Record<string, unknown> = {};
  for (const k of Object.keys(doc)) {
    if (!EXCLUDED.has(k)) kept[k] = k === BPMN_KEY && typeof doc[k] === 'object' && doc[k] ? figureDoc(doc[k] as XDocument) : doc[k];
  }
  const str = JSON.stringify(kept);
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return h;
}
