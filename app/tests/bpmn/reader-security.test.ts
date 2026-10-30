// @vitest-environment jsdom
/**
 * BPMN B2 reader security (F-B10, spec § 11 item 5): the in-app reader refuses the hostile files of fixtures/bpmn/hostile/ BEFORE any parser sees
 * them, with exactly the codes and messages of tools/bpmn-validate.mjs (one rule table, src/domain/process/securityRules.json, read by both).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LIMITS, securityCheck } from '@/domain/process';
import RULES from '@/domain/process/securityRules.json';
import { parseBpmn, parseXml } from '@/store/persistence/bpmn/read';
import { BPMN_FIXTURES, HOSTILE_FIXTURES, REPO, validate } from '../helpers/bpmnValidate';

const HOSTILE = readdirSync(HOSTILE_FIXTURES).filter((f) => f.endsWith('.bpmn')).sort().map((f) => join(HOSTILE_FIXTURES, f));
const SAMPLES = readdirSync(BPMN_FIXTURES).filter((f) => f.endsWith('.bpmn')).sort().map((f) => join(BPMN_FIXTURES, f));
const name = (f: string) => f.split('/').pop() ?? '';
const head = '<?xml version="1.0" encoding="UTF-8"?>\n<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="defs"'
  + ' targetNamespace="https://example.org/hostile">\n<bpmn:process id="proc" isExecutable="false">\n';
const doc = (body: string) => `${head}${body}</bpmn:process>\n</bpmn:definitions>\n`;

afterEach(() => vi.restoreAllMocks());

describe('B2 reader: one F-B10 rule table for the reader and tools/bpmn-validate.mjs', () => {
  it('the tool reads the shared table; the limits are those of the spec', () => {
    expect(readFileSync(join(REPO, 'tools', 'bpmn-validate.mjs'), 'utf8')).toContain('app/src/domain/process/securityRules.json');
    expect(LIMITS).toEqual({ bytes: 5 * 1024 * 1024, depth: 64, elements: 100000 });
    expect(Object.isFrozen(LIMITS)).toBe(true);
    expect(RULES.codes).toEqual(['too-large', 'doctype', 'entity', 'processing-instruction', 'bad-id', 'reserved-id', 'duplicate-id', 'too-deep',
      'too-many-elements', 'markup-in-text']);
  });
  it('same errors and warnings as the tool (codes and messages) on every hostile and sample file', () => {
    const tool = validate([...HOSTILE, ...SAMPLES], ['--no-schema']).results;
    const mine = [...HOSTILE, ...SAMPLES].map((f) => ({ file: name(f), ...securityCheck(readFileSync(f, 'utf8'), statSync(f).size) }));
    expect(mine).toEqual(tool.map((r) => ({ file: name(r.file), errors: r.errors, warnings: r.warnings })));
    expect(mine.filter((r) => r.errors.length).map((r) => r.file)).toEqual(HOSTILE.map(name).filter((f) => f !== 'html-in-names.bpmn'));
  });
});

describe('B2 reader: hostile files are refused before parsing', () => {
  it.each(HOSTILE.map(name))('%s', (f) => {
    const spy = vi.spyOn(DOMParser.prototype, 'parseFromString');
    const text = readFileSync(join(HOSTILE_FIXTURES, f), 'utf8'), r = parseBpmn(text), sec = securityCheck(text);
    expect(r.errors).toEqual(sec.errors);
    if (f === 'html-in-names.bpmn') {
      expect(r.doc?.root.local).toBe('definitions');
      expect(r.warnings.map((w) => w.code)).toEqual(['markup-in-text', 'markup-in-text']);
      expect(JSON.stringify(r.doc).includes('"local":"script"'), 'markup in names stays text, never an element').toBe(false);
    } else {
      expect(r.doc).toBeNull();
      expect(spy).not.toHaveBeenCalled();
    }
  });
});

describe('B2 reader: size, element-count and depth limits (generated)', () => {
  it('over 5 MB is refused; the size given by the file wins over the text length', () => {
    expect(parseBpmn(doc(`<bpmn:documentation>${'x'.repeat(LIMITS.bytes)}</bpmn:documentation>\n`)).errors.map((e) => e.code)).toEqual(['too-large']);
    expect(parseBpmn('', LIMITS.bytes + 1).errors.map((e) => e.code)).toEqual(['too-large']);
  });
  it('100,000 elements accepted, 100,001 refused (a generated file under 5 MB, refused before the parser)', () => {
    const tasks = (n: number) => Array.from({ length: n }, (_, i) => `<bpmn:task id="t${i}"/>\n`).join('');
    const at = doc(tasks(LIMITS.elements - 2)), over = doc(tasks(LIMITS.elements - 1));   // + definitions + process
    expect(over.length).toBeLessThan(LIMITS.bytes);
    expect(securityCheck(at).errors).toEqual([]);
    const spy = vi.spyOn(DOMParser.prototype, 'parseFromString'), r = parseBpmn(over);
    expect([r.doc, r.errors]).toEqual([null, [{ code: 'too-many-elements', message: `${LIMITS.elements + 1} elements > ${LIMITS.elements}` }]]);
    expect(spy).not.toHaveBeenCalled();
  });
  it('depth 64 accepted, 65 refused', () => {
    const nest = (n: number) => `${'<bpmn:subProcess>'.repeat(n)}${'</bpmn:subProcess>'.repeat(n)}\n`;
    expect(parseBpmn(doc(nest(62))).errors).toEqual([]);
    expect(parseBpmn(doc(nest(63))).errors.map((e) => e.code)).toEqual(['too-deep']);
  });
});

describe('B2 reader: malformed and non-BPMN input', () => {
  it('a document that is not well-formed is refused (not-xml), a non-BPMN root too (not-bpmn), with no tree', () => {
    expect(parseXml('<a><b></a>').errors.map((e) => e.code)).toEqual(['not-xml']);
    expect(parseXml('<a xmlns:x="u"><y:b/></a>').errors.map((e) => e.code)).toEqual(['not-xml']);
    expect(parseBpmn('<?xml version="1.0"?>\n<definitions/>').errors.map((e) => e.code)).toEqual(['not-bpmn']);
    expect(parseBpmn('not xml at all').doc).toBeNull();
  });
  it('a plain XML document reads into the infoset: declaration, comments around the root, CDATA as text', () => {
    const r = parseXml('<?xml version="1.0"?>\n<!-- c1 -->\n<a x="1"><![CDATA[<b>]]> &amp; t<!--c2--></a>\n<!-- c3 -->\n');
    expect(r.doc).toEqual({ kind: 'document', decl: '<?xml version="1.0"?>', before: '\n<!-- c1 -->\n', after: '\n<!-- c3 -->\n', root: {
      kind: 'element', ns: '', local: 'a', prefix: '', attrs: [{ name: 'x', ns: '', value: '1' }],
      children: [{ kind: 'text', text: '<b> & t' }, { kind: 'comment', text: 'c2' }] } });
  });
});
