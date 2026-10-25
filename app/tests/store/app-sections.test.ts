import { describe, expect, it } from 'vitest';
import { setPersonaAppSection } from '@/controllers/appSections';
import { setPersonaSections } from '@/controllers/navLayout';
import { deletePersona } from '@/controllers/pdcPersonas';
import { APP_SECTIONS } from '@/ui/zones/registry';
import { freshStore, snap } from './helpers';

const BRAND = APP_SECTIONS[0]!;
const doc = (s: ReturnType<typeof freshStore>) => s.getState().doc as Record<string, unknown>;

describe('persona.setAppSection (DEV-APP-SECTION-PERSONAS)', () => {
  it('hides Brand & theme from Admin without touching PERSONA_SECTIONS; undo / redo / showing it again restore the untouched case', () => {
    const s = freshStore(), before = snap(s), lists = JSON.stringify(doc(s).PERSONA_SECTIONS);
    expect('PERSONA_APP_SECTIONS' in doc(s)).toBe(false);
    setPersonaAppSection('admin', BRAND, false);
    expect(doc(s).PERSONA_APP_SECTIONS).toEqual({ admin: { 'brand-theme': false } });
    expect(JSON.stringify(doc(s).PERSONA_SECTIONS)).toBe(lists);
    expect(s.getState().history.undo.at(-1)!.label).toBe('Remove brand-theme from the menu of admin');
    s.undo();
    expect(snap(s)).toBe(before);
    s.redo();
    setPersonaAppSection('admin', BRAND, true);   // back to the catalogue default: the key goes
    expect(snap(s)).toBe(before);
  });
  it('shows it to Client case (not a default persona) and refuses the protected Advanced persona', () => {
    const s = freshStore(), before = snap(s), steps = s.getState().history.undo.length;
    setPersonaAppSection('clientcase', BRAND, true);
    expect(doc(s).PERSONA_APP_SECTIONS).toEqual({ clientcase: { 'brand-theme': true } });
    s.undo();
    setPersonaAppSection('advanced', BRAND, false);
    expect(snap(s)).toBe(before);
    expect(s.getState().history.undo.length).toBe(steps);   // refused: no change, no undo step
  });
  it('Sync menu to sequence stores the app sections as overrides and keeps them out of the legacy list (one undo step)', () => {
    const s = freshStore(), before = snap(s);
    setPersonaSections('clientcase', ['home', 'brand-theme'], APP_SECTIONS);
    expect((doc(s).PERSONA_SECTIONS as Record<string, string[]>).clientcase).toEqual(['home']);
    expect(doc(s).PERSONA_APP_SECTIONS).toEqual({ clientcase: { 'brand-theme': true } });
    setPersonaSections('admin', ['home'], APP_SECTIONS);
    expect(doc(s).PERSONA_APP_SECTIONS).toEqual({ clientcase: { 'brand-theme': true }, admin: { 'brand-theme': false } });
    s.undo(); s.undo();
    expect(snap(s)).toBe(before);
  });
  it('deleting a persona drops its overrides; undo restores them', () => {
    const s = freshStore();
    setPersonaAppSection('admin', BRAND, false);
    const kept = snap(s);
    deletePersona('admin');
    expect('PERSONA_APP_SECTIONS' in doc(s)).toBe(false);
    s.undo();
    expect(snap(s)).toBe(kept);
  });
});
