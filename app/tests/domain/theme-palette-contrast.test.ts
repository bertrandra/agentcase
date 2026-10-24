import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { rgbToHex } from '../../src/domain/theme/color';
import { HARMONIES } from '../../src/domain/theme/generatorSettings';
import { build, paletteFromSeed, paletteTable } from '../../src/domain/theme/palette';
import { seedOf } from '../../src/domain/theme/paletteParts';
import { failures } from '../helpers/contrastPairs';

/**
 * Every generated palette passes the contrast pairs of docs/THEME.md §7.4 (tests/helpers/contrastPairs) in light and dark, at the standard,
 * enhanced and high levels, through the themed display derivation: ~30 seeds (very light, very dark, grey, saturated…) x 5 slider steps x 4
 * harmonies, plus random seeds and slider values (fast-check).
 */
const SEEDS = ['#0b7a75', '#0058ab', '#ffff66', '#101010', '#808080', '#ff00ff', '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffa500',
  '#8b1a2b', '#5b2a9e', '#16693a', '#b84a00', '#7a4a24', '#00ffff', '#e91e63', '#3f51b5', '#009688', '#cddc39', '#795548', '#607d8b', '#f0f0f0',
  '#222831', '#ffd700', '#40e0d0', '#c0c0c0', '#6a5acd'];
const DISPLAYS = [['light', 'standard'], ['light', 'enhanced'], ['light', 'high'], ['dark', 'standard'], ['dark', 'enhanced'], ['dark', 'high']] as const;
const misses = (colours: ReturnType<typeof paletteFromSeed>, where: string): string[] =>
  DISPLAYS.flatMap(([mode, level]) => failures(paletteTable(colours, mode, level), level, `${mode}/${level}`).map((f) => `${where} ${mode}/${level}: ${f}`));

describe('generated palettes pass every contrast pair in every display', () => {
  it.each(SEEDS)('seed %s x contrast 0 / 25 / 50 / 75 / 100 x 4 harmonies', (seed) => {
    const out: string[] = [];
    for (const c of [0, 25, 50, 75, 100]) for (const h of HARMONIES) out.push(...misses(paletteFromSeed(seed, { contrast: c, harmony: h }), `${c} ${h}`));
    expect(out.join('\n')).toBe('');
  });
  it('random seeds and slider values (property)', () => {
    const hex = fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 })).map((c) => rgbToHex(c));
    fc.assert(fc.property(hex, fc.integer({ min: 0, max: 100 }), fc.constantFrom(...HARMONIES), (seed, c, h) => {
      expect(misses(paletteFromSeed(seed, { contrast: c, harmony: h }), `${seed} ${c} ${h}`)).toEqual([]);
    }), { numRuns: 60, seed: 20261024 });
  });
  it('the guard is a safety net: the fixed seeds already pass before it (balanced)', () => {
    for (const seed of SEEDS.slice(0, 10)) expect(misses(build(seedOf(seed), seed, 0.5, 'analogous'), seed)).toEqual([]);
  });
});
