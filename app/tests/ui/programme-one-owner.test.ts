import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PROGRAMME_ACTIVITIES } from '@/domain/programme';

/**
 * SPEC_BPMN § 19.7 F-B72 (phase B9a): an activity's description and parameters are held by the programme process only. A test fails when a
 * screen other than the Process section's parameter panel (or the BPMN import / editor) writes a programme activity's parameter key, and when an
 * activity description is written outside the programme (`src/domain/programme`).
 */
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) ? [p] : []; });
const src = (f: string): string => readFileSync(f, 'utf8');
const UI = [...walk('src/ui'), ...walk('src/controllers')];
const PANEL = 'src/ui/sections/scope/process/programme/ParamPanel.tsx';
/** The knowledge-transfer field, kept with the knowledge-subset chips it uses, rendered by the parameter panel only (`LeadField`). */
const LEAD = 'src/ui/sections/tune/knowledge/MultiPanels.tsx';
const KEYS = [...new Set(PROGRAMME_ACTIVITIES.flatMap((a) => a.params.map((p) => p.key)))];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('F-B72: one owner of the programme activities', () => {
  it('has parameter keys to check', () => expect(KEYS.length).toBeGreaterThan(20));
  it('no screen or controller writes an activity parameter key, except the Process parameter panel', () => {
    const writers = (k: string): string[] => {
      const field = new RegExp(`id=["'{\`]+${esc(k)}["'\`}]`), call = new RegExp(`(setInput|setValue|setProductKnowledge)\\([^)]*['"\`{ ]${esc(k)}\\b`);
      return UI.filter((f) => field.test(src(f)) || call.test(src(f)));
    };
    const bad = KEYS.flatMap((k) => writers(k).filter((f) => f !== PANEL && !(f === LEAD && k === 'ktLeadMonths')).map((f) => `${k}: ${f}`));
    expect(bad).toEqual([]);
    expect(UI.filter((f) => /\brmD\$\{/.test(src(f)))).toEqual([]);   // the stage fields written in a loop
  });
  it('the knowledge-transfer field is rendered by the parameter panel only', () => {
    expect(UI.filter((f) => f !== LEAD && /<LeadField\b/.test(src(f)))).toEqual([PANEL]);
    expect(/<LeadField\b/.test(src(LEAD))).toBe(false);
  });
  it('the parameter panel edits every parameter through the existing input commands (one undoable step each)', () => {
    expect(src(PANEL)).toMatch(/<NumberInput id=\{p\.key\}/);
    expect(src(PANEL)).toMatch(/<SelectInput id=\{p\.key\}/);
  });
  // Phase B9b: the waves are sub-processes of the programme; their start, dependency and the setup capacity are edited in the wave's panel only.
  it('the wave start, the wave dependency and the transformation-team capacity are written by the Process wave panel only', () => {
    const WAVES = 'src/ui/sections/scope/process/programme/';
    const writers = (fn: string) => walk('src/ui').filter((f) => new RegExp(`\\b${fn}\\(`).test(src(f))).map((f) => f.replace(/\\/g, '/'));
    expect(writers('setWaveStart')).toEqual([`${WAVES}WavePanel.tsx`]);
    expect(writers('setMaxConcurrentSetups')).toEqual([`${WAVES}WavePanel.tsx`]);
    expect(writers('setWaveDependency')).toEqual([`${WAVES}WaveDependency.tsx`]);
    expect(UI.filter((f) => /<WaveDependency\b/.test(src(f)))).toEqual([`${WAVES}WavePanel.tsx`]);
  });
  // Phase B9e (§ 19.11): the 📋 Programme screen is the one other view of the activities. It edits them through the panel's own fields (`Param`) and
  // the editors it shares with the panel (Enabled = the opt-in switch, the type, the description), one key and one `input.set` command per value.
  it('the 📋 Programme screen is the only other writer: through the panel\'s fields and the shared editors, nothing else', () => {
    const SCREEN = 'src/ui/sections/scope/programme/', EDITORS = `${SCREEN}Editors.tsx`, ROW = `${SCREEN}Row.tsx`;
    const users = (re: RegExp) => UI.filter((f) => re.test(src(f))).map((f) => f.replace(/\\/g, '/')).sort();
    expect(users(/<Param\b/)).toEqual([ROW, PANEL].sort());
    expect(users(/<(TypeSelect|DescriptionField)\b/)).toEqual([ROW, PANEL].sort());
    expect(users(/<EnabledBox\b/)).toEqual([ROW]);
    expect(users(/\b(costProfileKey|descriptionKey)\(/)).toEqual([EDITORS, PANEL].sort());
    expect(users(/costProfile_|activityDesc_/)).toEqual([]);   // the keys are named by the domain only
    expect(src(EDITORS).match(/\b(setInput|setChecked|setValue|setProductKnowledge|dispatch)\(/g)?.every((m) => m === 'setInput(')).toBe(true);
    const writers = walk(SCREEN).filter((f) => /\b(setInput|setChecked|setValue|setProductKnowledge|dispatch)\(/.test(src(f)))
      .map((f) => f.replace(/\\/g, '/'));
    expect(writers).toEqual([EDITORS]);
  });
  it('no activity description is written outside the programme', () => {
    const files = walk('src').filter((f) => !f.startsWith(join('src', 'domain', 'programme')));
    const pieces = PROGRAMME_ACTIVITIES.flatMap((a) => a.description.split(/[.;:]\s/).map((s) => s.replace(/\.$/, '').trim()).filter((s) => s.length >= 18)
      .map((s) => ({ kind: a.kind, s })));
    expect(pieces.length).toBeGreaterThan(20);
    const bad = pieces.flatMap((p) => files.filter((f) => src(f).includes(p.s)).map((f) => `${p.kind} "${p.s}": ${f}`));
    expect(bad).toEqual([]);
  });
});
