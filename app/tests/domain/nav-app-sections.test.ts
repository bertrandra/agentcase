import { describe, expect, it } from 'vitest';
import { appSectionShown, nextAppOverrides, readAppOverrides, splitMenu, withAppSections } from '@/domain/nav/appSections';
import { APP_SECTIONS } from '@/ui/zones/registry';

const BRAND = { id: 'brand-theme', personas: ['admin', 'builder'] };
const LISTS = { admin: ['home', 'board'], builder: ['home'], clientcase: ['home'] };

describe('app sections in the persona menus (DEV-APP-SECTION-PERSONAS)', () => {
  it('the catalogue names the app sections: Process (BPMN), Programme (B9e) for Builder, Brand & theme, Organisation, Audit (B7), Who does what (B6b)', () => {
    const P = ['admin', 'business-journey'];
    expect(APP_SECTIONS.map((s) => [s.id, s.personas])).toEqual([['process', ['builder']], ['programme', ['builder']],
      ['brand-theme', ['admin', 'builder', 'business-journey']], ['organisation', P], ['audit', P], ['who-does-what', P]]);
  });
  it('without overrides: appended to the personas the catalogue names, the others untouched (the build before lot 7)', () => {
    expect(withAppSections(LISTS, [BRAND])).toEqual({ admin: ['home', 'board', 'brand-theme'], builder: ['home', 'brand-theme'], clientcase: ['home'] });
    expect(withAppSections(LISTS, [BRAND], {})).toEqual(withAppSections(LISTS, [BRAND]));
  });
  it('an override hides it from a default persona or shows it to another one', () => {
    const out = withAppSections(LISTS, [BRAND], { admin: { 'brand-theme': false }, clientcase: { 'brand-theme': true } });
    expect(out).toEqual({ admin: ['home', 'board'], builder: ['home', 'brand-theme'], clientcase: ['home', 'brand-theme'] });
  });
  it('an id already in a legacy list (added by hand before lot 7) counts as shown, and an override false still hides it', () => {
    const lists = { clientcase: ['brand-theme', 'home'] };
    expect(withAppSections(lists, [BRAND]).clientcase).toEqual(['brand-theme', 'home']);
    expect(withAppSections(lists, [BRAND], { clientcase: { 'brand-theme': false } }).clientcase).toEqual(['home']);
    expect(appSectionShown(BRAND, 'clientcase', lists.clientcase, {})).toBe(true);
  });
  it('nextAppOverrides is normalised: a value equal to the default is dropped, nothing left = undefined', () => {
    const off = nextAppOverrides({}, BRAND, 'admin', LISTS.admin, false);
    expect(off).toEqual({ admin: { 'brand-theme': false } });
    expect(nextAppOverrides(off!, BRAND, 'admin', LISTS.admin, true)).toBeUndefined();
    expect(nextAppOverrides({}, BRAND, 'admin', LISTS.admin, true)).toBeUndefined();   // already the default
    const two = nextAppOverrides(off!, BRAND, 'clientcase', LISTS.clientcase, true);
    expect(two).toEqual({ admin: { 'brand-theme': false }, clientcase: { 'brand-theme': true } });
    expect(nextAppOverrides(two!, BRAND, 'admin', LISTS.admin, true)).toEqual({ clientcase: { 'brand-theme': true } });
  });
  it('readAppOverrides keeps only booleans of objects', () => {
    expect(readAppOverrides(undefined)).toEqual({});
    expect(readAppOverrides([1])).toEqual({});
    expect(readAppOverrides({ a: { x: true, y: 'no', z: 0 }, b: 3, c: { w: false }, d: {} })).toEqual({ a: { x: true }, c: { w: false } });
  });
  it('splitMenu separates the app sections from the legacy ids, order kept', () => {
    const r = splitMenu(['home', 'brand-theme', 'board'], [BRAND]);
    expect(r.legacy).toEqual(['home', 'board']);
    expect([...r.app]).toEqual(['brand-theme']);
  });
});
