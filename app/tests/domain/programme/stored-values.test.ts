import { describe, expect, it } from 'vitest';
import { makeInputs } from '@/domain/inputs';
import { caseValues, programmeValuesOf, serialize, storedElement, withoutStoredValues, withProgrammeValues, type XDocument } from '@/domain/process';
import { emptiedStoredValues, keepStoredValues } from '@/domain/process/storedValues';
import { OPT_INS, PROGRAMME_ACTIVITIES } from '@/domain/programme';
import { isProgrammeKey, PROGRAMME_VALUE_KEYS, programmeKeyOrder } from '@/domain/programme/storedKeys';
import { parseBpmn } from '@/store/persistence/bpmn/read';
import { makeDefaultDoc } from '@/store/instance';

/**
 * Phase B9c (docs/SPEC_BPMN.md § 6.1 schema v4, § 19.5): the programme's stored values live in the case's document, one `ac:programmeValues`
 * element of the delivery process; the typed views read them through `caseValues` (the form values over them); edits are node-level.
 */
const doc = (): XDocument => makeDefaultDoc().BPMN;

describe('the stored keys are the programme activities\' parameters', () => {
  it('every catalogue parameter held in the case values, every opt-in switch and parameter, the two legacy amounts, and nothing else', () => {
    const fromCatalogue = PROGRAMME_ACTIVITIES.flatMap((a) => a.params).filter((p) => p.store !== 'knowledge').map((p) => p.key);
    const fromOptIns = OPT_INS.flatMap((d) => [d.on, ...d.params.map((p) => p.key)]);
    expect(new Set(PROGRAMME_VALUE_KEYS)).toEqual(new Set([...fromCatalogue, ...fromOptIns, 'setupTraining', 'setupGov']));
    expect(new Set(PROGRAMME_VALUE_KEYS).size).toBe(PROGRAMME_VALUE_KEYS.length);
  });
  it('the per-line and per-activity keys; case-level form values are not', () => {
    expect(['costProfile_tooling', 'activityDesc_pilot', 'wbsCode-pilot', 'pilotFte'].every(isProgrammeKey)).toBe(true);
    expect(['costProfile_', 'horizon', 'ktLeadMonths', 'rmStart', 'khEnabled', 'infra'].some(isProgrammeKey)).toBe(false);
    expect(programmeKeyOrder(['wbsCode-pilot', 'costProfile_a', 'pilotWeeks', 'rmD1'])).toEqual(['rmD1', 'pilotWeeks', 'costProfile_a', 'wbsCode-pilot']);
  });
});

describe('the default case holds them in its document, none in its form values', () => {
  it('values of the default case, in catalogue order, out of dom.values', () => {
    const d = makeDefaultDoc(), v = programmeValuesOf(d.BPMN);
    expect(v.pilotFte).toBe('3');
    expect(v.setupCoaching).toBe('35000');
    expect(Object.keys(v)).toEqual(programmeKeyOrder(Object.keys(v)));
    expect(Object.keys(d.dom.values).filter(isProgrammeKey)).toEqual([]);
    expect(makeInputs(d).p('pilotWeeks')).toBe(12);
  });
});

describe('edits are node-level and the document round-trips byte-identically', () => {
  it('a set value is an attribute change; a new key is appended at the end; null removes it', () => {
    const a = doc(), e = storedElement(a)!;
    const b = withProgrammeValues(a, { pilotFte: '4' }), eb = storedElement(b)!;
    expect(eb.children.length).toBe(e.children.length);
    expect(eb.children.filter((c, i) => c !== e.children[i]).length).toBe(1);
    const c = withProgrammeValues(b, { optHypercare: 'on' }), ec = storedElement(c)!;
    expect(Object.keys(programmeValuesOf(c)).at(-1)).toBe('optHypercare');
    expect(ec.children.slice(0, eb.children.length - 1).every((x, i) => x === eb.children[i])).toBe(true);
    const d = withProgrammeValues(c, { optHypercare: null });
    expect(serialize(d)).toBe(serialize(b));
    expect(withProgrammeValues(b, { pilotFte: '4' })).toBe(b);
    expect(withProgrammeValues(b, { horizon: '5' })).toBe(b);
  });
  it('text -> tree -> text identical, with a description holding new lines and quotes', () => {
    const d = withProgrammeValues(doc(), { 'activityDesc_pilot': 'Line 1\nLine "2" & <3>', 'wbsCode-pilot': '1.2.3' });
    const r = parseBpmn(serialize(d));
    expect(r.errors).toEqual([]);
    expect(r.doc).toStrictEqual(d);
    expect(programmeValuesOf(r.doc!)['activityDesc_pilot']).toBe('Line 1\nLine "2" & <3>');
  });
  it('an export leaves them out; a product\'s own document keeps an empty element; an import keeps the case\'s', () => {
    const d = withProgrammeValues(doc(), { pilotFte: '5' });
    expect(storedElement(withoutStoredValues(d))).toBeUndefined();
    expect(programmeValuesOf(emptiedStoredValues(d))).toEqual({});
    expect(storedElement(emptiedStoredValues(d))).toBeDefined();
    expect(programmeValuesOf(keepStoredValues(withoutStoredValues(d), d))).toEqual(programmeValuesOf(d));
  });
});

describe('caseValues: the form values over the stored values (memoised)', () => {
  it('a form value wins (a product\'s own override), the stored value otherwise; same object while nothing changes', () => {
    const d = makeDefaultDoc(), own = { ...d, dom: { ...d.dom, values: { ...d.dom.values, pilotFte: '7' } } };
    expect(caseValues(d).pilotFte).toBe('3');
    expect(caseValues(own).pilotFte).toBe('7');
    expect(caseValues(d)).toBe(caseValues(d));
    expect(caseValues({ dom: { values: { a: '1' } } })).toEqual({ a: '1' });
  });
});
