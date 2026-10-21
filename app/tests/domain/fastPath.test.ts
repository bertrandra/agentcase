import { describe, expect, it } from 'vitest';
import { fastPathSections, flattenFast, passesFastPath } from '@/domain/nav/fastPath';
import type { NavSection } from '@/domain/nav/layout';

const sec = (id: string, mvp?: boolean): NavSection => ({ id, label: id, description: '', group: 'g', groupSeq: 1, ...(mvp ? { mvp } : {}) });
const list = [sec('home'), sec('a', true), sec('b'), sec('c', true)];

describe('Fast Path predicate', () => {
  it('off keeps everything; on keeps mvp sections and Welcome only', () => {
    expect(list.filter((s) => passesFastPath(s, false))).toHaveLength(4);
    expect(fastPathSections(list, true).map((s) => s.id)).toEqual(['home', 'a', 'c']);
    expect(fastPathSections(list, false)).toBe(list);
    expect(passesFastPath(undefined, true)).toBe(false);
    expect(passesFastPath(undefined, false)).toBe(true);
  });
  it('drops filtered stops of a guided sequence, and a step left empty vanishes', () => {
    const seq = { on: true, steps: [{ label: 'One', sections: ['a', 'b'] }, { label: 'Two', sections: ['b'] }, { label: 'Three', sections: ['c', 'zzz'] }] };
    expect(flattenFast(seq, list, true)).toEqual([{ si: 0, step: 'One', sec: 'a' }, { si: 2, step: 'Three', sec: 'c' }]);
    expect(flattenFast(seq, list, false)).toHaveLength(5);
  });
});
