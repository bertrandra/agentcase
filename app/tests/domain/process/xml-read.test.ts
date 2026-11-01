import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { serialize } from '@/domain/process';
import { readXml } from '@/domain/process/xmlRead';
import { parseBpmn } from '@/store/persistence/bpmn/read';

/**
 * SPEC_FIXES FX-02: the DOM-free reader of the shipped XML gives the browser reader's very tree for the default process, and writes back to the
 * same bytes — so the domain can read `catalog/defaultProcess.bpmn` itself (no DOMParser, no build step).
 */
const text = readFileSync('src/domain/catalog/defaultProcess.bpmn', 'utf8');

describe('readXml (DOM-free, trusted shipped XML)', () => {
  it('the default process: the same tree as the hardened DOM reader, and the same bytes written back', () => {
    const mine = readXml(text), dom = parseBpmn(text);
    expect(dom.errors).toEqual([]);
    expect(mine).toEqual(dom.doc);
    expect(serialize(mine)).toBe(text);
  });
  it('entities, comments, default and prefixed namespaces, single quotes', () => {
    const d = readXml(`<?xml version="1.0"?>\n<r xmlns="urn:a" xmlns:b='urn:b'><!-- c --><b:x b:k="1 &amp; 2" k='&lt;3'>t &#65;&#x42;</b:x></r>\n`);
    type El = { ns: string; local: string; attrs: { name: string; ns: string; value: string }[]; children: { text: string }[] };
    const x = d.root.children[1] as unknown as El;
    expect([d.root.ns, x.ns, x.local]).toEqual(['urn:a', 'urn:b', 'x']);
    expect(x.attrs.map((a) => [a.name, a.ns, a.value])).toEqual([['b:k', 'urn:b', '1 & 2'], ['k', '', '<3']]);
    expect(x.children[0]!.text).toBe('t AB');
    expect(() => readXml('<a><b></a>')).toThrow(/expected/);
  });
});
