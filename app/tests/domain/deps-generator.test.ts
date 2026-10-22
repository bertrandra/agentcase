import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { buildLayers, cycles, downstream, upstream, type DepEdge } from '@/domain/zones/graph';
import { buildDeps, formatDeps } from '../../scripts/lib/build';

/** The generator on a small synthetic project: zones x (input), y (calc), z (result), a section of each kind, a barrel, a test. */
const root = mkdtempSync(join(tmpdir(), 'deps-'));
const put = (rel: string, text: string): void => { mkdirSync(dirname(join(root, rel)), { recursive: true }); writeFileSync(join(root, rel), text); };
afterAll(() => rmSync(root, { recursive: true, force: true }));

put('src/domain/zones/catalog.json', JSON.stringify({ zones: [{ id: 'x', lane: 'input' }, { id: 'y', lane: 'calc' }, { id: 'z', lane: 'result' }, { id: 'sh', lane: 'shared' }], figures: [{ id: 'fx' }, { id: 'fy' }] }));
put('src/domain/zones/graphConfig.json', JSON.stringify({ ignore: [{ path: 'src/ui/chrome/', reason: 'chrome' }], routes: {} }));
put('src/ui/zones/data/sectionCatalog.json', JSON.stringify([{ id: 's-in', label: 'In', group: 'g' }, { id: 's-out', label: 'Out', group: 'g' }, { id: 's-ref', label: 'Ref', group: 'g' }]));
put('src/ui/zones/data/sectionScope.json', JSON.stringify({ 's-in': 'I-input', 's-out': 'R-conso', 's-ref': 'S-static' }));
put('src/domain/x.ts', '/** @calc-zone x @owner fx */\nexport const a = 1;\nexport const b = 2;\n');
put('src/domain/y/impl.ts', "/** @calc-zone y @owner fy */\nimport { a } from '../x';\nimport type { T } from '../z';\nexport const y = a + 1;\nexport const unused = 0;\n");
put('src/domain/y/index.ts', "/** @calc-zone y */\nexport { y } from './impl';\nexport * from '../x';\n");
put('src/domain/z.ts', "/** @calc-zone z */\nimport { y } from './y';\nexport type T = number;\nexport const z = y;\n");
put('src/domain/shared.ts', '/** @calc-zone sh */\nexport const s = 0;\n');
put('src/controllers/c.ts', "/** @calc-zone x */\nimport { b } from '@/domain/x';\nexport const set = b;\n");
put('src/ui/chrome/Frame.tsx', "import { z } from '@/domain/z';\nexport const F = z;\n");
put('src/ui/sections/g.ts', "export const G = {\n  's-in': () => import('./g/in'),\n  's-out': () => import('./g/out'),\n  's-ref': () => import('./g/ref'),\n};\n");
put('src/ui/sections/g/in/index.tsx', "import { set } from '@/controllers/c';\nimport { s } from '@/domain/shared';\nexport default () => set + s;\n");
put('src/ui/sections/g/out/index.tsx', "import { z } from '@/domain/z';\nimport { F } from '../../../chrome/Frame';\nexport default () => z + F;\n");
put('src/ui/sections/g/ref/index.tsx', 'export default () => 1;\n');
put('tests/a.test.ts', "import { y } from '@/domain/y';\nexport const t = y;\n");
put('tests/b.test.tsx', "import S from '@/ui/sections/g/out';\nexport const t = S;\n");

const d = buildDeps(root);
const has = (a: string, b: string, k: string): number | undefined => d.edges.find((e) => e[0] === a && e[1] === b && e[2] === k)?.[3];

describe('dependency generator (synthetic project)', () => {
  it('flattens a barrel by symbol: y reads x through the barrel, z reads y; type-only imports are not edges', () => {
    expect(has('x', 'y', 'z')).toBe(1);
    expect(has('y', 'z', 'z')).toBe(1);
    expect(has('z', 'y', 'z')).toBeUndefined();
  });
  it('input sections write through controllers, result sections read; the ignore list and shared zones create no edge', () => {
    expect(has('s-in', 'x', 'w')).toBe(1);
    expect(d.edges.filter((e) => e[2] !== 'z' && (e[0] === 's-in' || e[1] === 's-in'))).toHaveLength(1);
    expect(has('z', 's-out', 'r')).toBe(1);
    expect(d.edges.some((e) => e[0] === 's-ref' || e[1] === 's-ref')).toBe(false);
    expect(d.edges.some((e) => e.includes('sh'))).toBe(false);
  });
  it('owners and consumers: a figure is consumed by the sections whose closure reaches its owner', () => {
    expect(d.figures.find((f) => f.id === 'fx')).toEqual({ id: 'fx', owner: 'src/domain/x.ts', consumers: ['s-in', 's-out'] });
    expect(d.figures.find((f) => f.id === 'fy')?.consumers).toEqual(['s-out']);
  });
  it('tests map to the zones and sections of their import closure', () => {
    const t = Object.fromEntries(d.tests.map(([f, zs, ss]) => [f, [zs.map((i) => d.zones[i]!.id), ss.map((i) => d.sections[i]!.id)]]));
    expect(t['tests/a.test.ts']).toEqual([['x', 'y'], []]);
    expect(t['tests/b.test.tsx']![0]).toEqual(['x', 'y', 'z']);
    expect(t['tests/b.test.tsx']![1]).toEqual(['s-out']);
  });
  it('is deterministic', () => { expect(formatDeps(buildDeps(root))).toBe(formatDeps(d)); });
});

describe('zone graph functions', () => {
  const e: DepEdge[] = [['a', 'b', 'z', 3], ['b', 'c', 'z', 2], ['c', 'b', 'z', 1], ['c', 's', 'r', 1]];
  it('downstream and upstream follow the flow', () => {
    expect([...downstream(e, ['a'])].sort()).toEqual(['a', 'b', 'c', 's']);
    expect([...upstream(e, ['s'])].sort()).toEqual(['a', 'b', 'c', 's']);
    expect([...downstream(e, ['c'])].sort()).toEqual(['b', 'c', 's']);
  });
  it('reports the cycle and orders around it, setting the lightest link aside', () => {
    expect(cycles(['a', 'b', 'c'], e)).toEqual([['b', 'c']]);
    const l = buildLayers(['a', 'b', 'c'], e);
    expect(l.order).toEqual(['a', 'b', 'c']);
    expect(l.feedback).toEqual([['c', 'b', 'z', 1]]);
    expect(l.layer).toEqual({ a: 0, b: 1, c: 2 });
  });
});
